import datetime
import logging
from typing import Dict, Any, Optional
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError

# Configure logger
logger = logging.getLogger("smartclass_backend")

class DBService:
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017", db_name: str = "smartclass_ai"):
        self.client = None
        self.db = None
        self.students = None
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.connect()

    def connect(self):
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            # Force a connection test
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.students = self.db["students"]
            self.attendance = self.db["attendance"]
            
            # Create a unique index on rollNumber
            self.students.create_index("rollNumber", unique=True)
            # Composite unique index: one attendance record per student per day
            self.attendance.create_index(
                [("rollNumber", 1), ("date", 1)],
                unique=True
            )
            logger.info(f"Connected to MongoDB at {self.mongo_uri}, database: {self.db_name}")
        except (ConnectionFailure, Exception) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.db = None
            self.students = None
            self.attendance = None

    def get_student(self, roll_number: str) -> Optional[Dict[str, Any]]:
        if self.students is None:
            logger.warning("Database not connected. Operations are disabled.")
            return None
        return self.students.find_one({"rollNumber": roll_number.strip().upper()}, {"_id": 0})

    def register_student(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.students is None:
            raise RuntimeError("Database not connected")
        
        roll_number = student_data["rollNumber"].strip().upper()
        
        # Prepare document
        student_doc = {
            "fullName": student_data["fullName"].strip(),
            "rollNumber": roll_number,
            "email": student_data["email"].strip(),
            "department": student_data["department"].strip(),
            "branch": student_data["branch"].strip(),
            "year": student_data["year"],
            "section": student_data["section"].strip().upper(),
            "status": "registered",  # registered -> captured -> enrolled
            "imageCount": 0,
            "embeddingsCount": 0,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }
        
        try:
            self.students.insert_one(student_doc)
            # Remove MongoDB internal _id before returning
            student_doc.pop("_id", None)
            return student_doc
        except DuplicateKeyError:
            raise ValueError(f"Student with Roll Number {roll_number} is already registered.")

    def update_student_images(self, roll_number: str, image_count: int, status: str = "captured") -> bool:
        if self.students is None:
            return False
        
        result = self.students.update_one(
            {"rollNumber": roll_number.strip().upper()},
            {
                "$set": {
                    "imageCount": image_count,
                    "status": status,
                    "updatedAt": datetime.datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def update_student_embeddings(self, roll_number: str, embeddings: list, status: str = "enrolled") -> bool:
        if self.students is None:
            return False
        
        # In a real-world system we might save embeddings in a separate collection or store the average embedding
        # For simplicity and ease of querying, we store the list of embeddings and the average embedding
        # on the student document.
        import numpy as np
        
        avg_embedding = None
        if embeddings:
            np_embeddings = np.array(embeddings)
            avg_embedding = np_embeddings.mean(axis=0).tolist()
            
        result = self.students.update_one(
            {"rollNumber": roll_number.strip().upper()},
            {
                "$set": {
                    "faceEmbeddings": embeddings,  # List of raw embeddings (e.g. 128 or 512 dimensions)
                    "averageEmbedding": avg_embedding,  # Single unified embedding for fast matching
                    "embeddingsCount": len(embeddings),
                    "status": status,
                    "updatedAt": datetime.datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def get_all_students(self) -> list:
        """Return all students (excluding raw embeddings for performance)."""
        if self.students is None:
            return []
        cursor = self.students.find(
            {},
            {"_id": 0, "faceEmbeddings": 0, "averageEmbedding": 0}
        )
        return list(cursor)

    def get_enrolled_students(self) -> list:
        """
        Return all students with status='enrolled' including their averageEmbedding.
        Used for face recognition during attendance marking.
        """
        if self.students is None:
            return []
        cursor = self.students.find(
            {"status": "enrolled", "averageEmbedding": {"$exists": True}},
            {"_id": 0, "faceEmbeddings": 0}  # keep averageEmbedding
        )
        return list(cursor)

    def mark_attendance(
        self,
        roll_number: str,
        full_name: str,
        department: str,
        branch: str,
        year: int,
        section: str,
        method: str = "face",
        confidence: float = 1.0,
    ):
        """
        Insert an attendance record. Returns (True, message) if newly marked,
        (False, message) if already marked today.
        """
        if self.attendance is None:
            raise RuntimeError("Database not connected")

        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        now = datetime.datetime.utcnow()

        record = {
            "rollNumber": roll_number.strip().upper(),
            "fullName": full_name,
            "department": department,
            "branch": branch,
            "year": year,
            "section": section,
            "date": today,
            "timestamp": now,
            "method": method,
            "confidence": confidence,
            "status": "present",
        }

        try:
            self.attendance.insert_one(record)
            logger.info(f"Attendance marked for {roll_number} on {today} via {method}")
            return True, f"Attendance marked for {full_name}"
        except DuplicateKeyError:
            return False, f"{full_name} is already marked present today"

    def get_today_attendance(self) -> list:
        """Return all attendance records for today."""
        if self.attendance is None:
            return []
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        cursor = self.attendance.find(
            {"date": today},
            {"_id": 0}
        ).sort("timestamp", -1)
        results = []
        for rec in cursor:
            rec["timestamp"] = rec["timestamp"].isoformat() if hasattr(rec["timestamp"], "isoformat") else str(rec["timestamp"])
            results.append(rec)
        return results

    def get_student_attendance(self, roll_number: str) -> list:
        """Return attendance history for a specific student."""
        if self.attendance is None:
            return []
        cursor = self.attendance.find(
            {"rollNumber": roll_number.strip().upper()},
            {"_id": 0}
        ).sort("date", -1)
        results = []
        for rec in cursor:
            rec["timestamp"] = rec["timestamp"].isoformat() if hasattr(rec["timestamp"], "isoformat") else str(rec["timestamp"])
            results.append(rec)
        return results

    def get_attendance_stats(self) -> dict:
        """Summary stats: total enrolled, present today, absent today, percentage."""
        if self.students is None or self.attendance is None:
            return {"totalEnrolled": 0, "presentToday": 0, "absentToday": 0, "attendancePercent": 0}

        total_enrolled = self.students.count_documents({"status": "enrolled"})
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        present_today = self.attendance.count_documents({"date": today})
        absent_today = max(0, total_enrolled - present_today)
        percent = round((present_today / total_enrolled * 100), 1) if total_enrolled > 0 else 0.0

        return {
            "totalEnrolled": total_enrolled,
            "presentToday": present_today,
            "absentToday": absent_today,
            "attendancePercent": percent,
        }

    def clear_today_attendance(self) -> int:
        """Delete all attendance records for today from the DB."""
        if self.attendance is None:
            raise RuntimeError("Database not connected")
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        result = self.attendance.delete_many({"date": today})
        logger.info(f"Cleared today's attendance. Deleted {result.deleted_count} records.")
        return result.deleted_count

    def get_student_assessments(self, roll_number: str) -> list:
        """Return all assessments for a specific student."""
        if self.db is None:
            return []
        cursor = self.db["assessments"].find({"rollNumber": roll_number.strip().upper()}, {"_id": 0})
        return list(cursor.sort("date", -1))

    def seed_student_demo_data(self, roll_number: str):
        """Seed mock assessments and attendance records for a student if none exist."""
        if self.db is None or self.students is None:
            return
        
        roll_number_upper = roll_number.strip().upper()
        student = self.get_student(roll_number_upper)
        if not student:
            return

        # 1. Seed Assessments
        assessments_coll = self.db["assessments"]
        if assessments_coll.count_documents({"rollNumber": roll_number_upper}) == 0:
            mock_assessments = [
                {
                    "rollNumber": roll_number_upper,
                    "title": "Midterm Exam",
                    "subject": "Artificial Intelligence",
                    "marksObtained": 18.5,
                    "maxMarks": 20.0,
                    "type": "Exam",
                    "grade": "A",
                    "date": "2026-07-02",
                    "feedback": "Outstanding understanding of search algorithms and neural network foundations."
                },
                {
                    "rollNumber": roll_number_upper,
                    "title": "Quiz 1",
                    "subject": "Computer Vision",
                    "marksObtained": 8.0,
                    "maxMarks": 10.0,
                    "type": "Quiz",
                    "grade": "B+",
                    "date": "2026-06-15",
                    "feedback": "Good progress. Pay closer attention to image convolution padding methods."
                },
                {
                    "rollNumber": roll_number_upper,
                    "title": "Lab Assignment 2",
                    "subject": "Deep Learning",
                    "marksObtained": 24.0,
                    "maxMarks": 25.0,
                    "type": "Assignment",
                    "grade": "O",
                    "date": "2026-07-10",
                    "feedback": "Perfect implementation of convolutional autoencoder architectures."
                },
                {
                    "rollNumber": roll_number_upper,
                    "title": "Mini Project Phase 1",
                    "subject": "Software Engineering",
                    "marksObtained": 42.0,
                    "maxMarks": 50.0,
                    "type": "Project",
                    "grade": "A",
                    "date": "2026-07-05",
                    "feedback": "Excellent requirements documentation and flow diagram accuracy."
                },
                {
                    "rollNumber": roll_number_upper,
                    "title": "Pop Quiz",
                    "subject": "Database Management",
                    "marksObtained": 9.0,
                    "maxMarks": 10.0,
                    "type": "Quiz",
                    "grade": "A+",
                    "date": "2026-07-14",
                    "feedback": "Great quick-thinking performance on SQL normalization queries."
                }
            ]
            assessments_coll.insert_many(mock_assessments)
            logger.info(f"Seeded mock assessments for student {roll_number_upper}")

        # 2. Seed past attendance
        if self.attendance.count_documents({"rollNumber": roll_number_upper}) == 0:
            import random
            random.seed(sum(ord(c) for c in roll_number_upper))
            
            today_dt = datetime.date.today()
            records_to_insert = []
            
            for i in range(30, 0, -1):
                past_date = today_dt - datetime.timedelta(days=i)
                # Skip weekends
                if past_date.weekday() >= 5:
                    continue
                
                # ~90% attendance rate
                if random.random() < 0.90:
                    dt_str = past_date.strftime("%Y-%m-%d")
                    # Random time between 8:50 AM and 9:15 AM
                    minute = random.randint(50, 59) if random.random() < 0.5 else random.randint(0, 15)
                    hour = 8 if minute >= 50 else 9
                    timestamp = datetime.datetime.combine(past_date, datetime.time(hour, minute, random.randint(0, 59)))
                    
                    records_to_insert.append({
                        "rollNumber": roll_number_upper,
                        "fullName": student["fullName"],
                        "department": student.get("department", ""),
                        "branch": student.get("branch", ""),
                        "year": student.get("year", 0),
                        "section": student.get("section", ""),
                        "date": dt_str,
                        "timestamp": timestamp,
                        "method": "face",
                        "confidence": round(random.uniform(0.85, 0.99), 4),
                        "status": "present"
                    })
            
            if records_to_insert:
                self.attendance.insert_many(records_to_insert)
                logger.info(f"Seeded {len(records_to_insert)} attendance records for {roll_number_upper}")

    def get_attendance_streak(self, roll_number: str) -> int:
        """Return the current consecutive presence streak of active weekdays."""
        if self.attendance is None:
            return 0
        
        records = self.get_student_attendance(roll_number)
        if not records:
            return 0
        
        present_dates = {r["date"] for r in records}
        
        today = datetime.date.today()
        streak = 0
        current_check = today
        
        if current_check.weekday() == 5:
            current_check = current_check - datetime.timedelta(days=1)
        elif current_check.weekday() == 6:
            current_check = current_check - datetime.timedelta(days=2)
            
        while True:
            if current_check.weekday() >= 5:
                current_check = current_check - datetime.timedelta(days=1)
                continue
                
            date_str = current_check.strftime("%Y-%m-%d")
            if date_str in present_dates:
                streak += 1
                current_check = current_check - datetime.timedelta(days=1)
            else:
                if current_check == today:
                    yesterday = today - datetime.timedelta(days=1)
                    if yesterday.weekday() == 6:
                        yesterday = yesterday - datetime.timedelta(days=2)
                    elif yesterday.weekday() == 5:
                        yesterday = yesterday - datetime.timedelta(days=1)
                        
                    y_date_str = yesterday.strftime("%Y-%m-%d")
                    if y_date_str in present_dates:
                        current_check = yesterday
                        continue
                break
                
        return streak


# Global DB Instance
import os
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
db_name = os.getenv("DB_NAME", "smartclass_ai")
db_service = DBService(mongo_uri=mongo_uri, db_name=db_name)
