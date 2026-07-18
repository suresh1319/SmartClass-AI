import base64
import os
import glob
import numpy as np
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from models.student import StudentRegisterRequest
from services.db_service import db_service
from services.face_service import face_service

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/", summary="List all students")
def list_all_students():
    """Return all registered students (no embeddings included)."""
    students = db_service.get_all_students()
    # Convert datetime objects to ISO strings for JSON serialisation
    for s in students:
        for key in ("createdAt", "updatedAt"):
            if key in s and hasattr(s[key], "isoformat"):
                s[key] = s[key].isoformat()
    return {"students": students, "count": len(students)}

class EmbeddingsRequest(BaseModel):
    rollNumber: str

class ValidateFrameRequest(BaseModel):
    rollNumber: str
    pose: str
    image: str  # Base64 string containing JPEG data

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_student(request: StudentRegisterRequest):
    try:
        # Register the student in DB
        student = db_service.register_student(request.model_dump())
        
        # Create dataset directory for the student
        dataset_dir = os.path.join("dataset", student["rollNumber"])
        os.makedirs(dataset_dir, exist_ok=True)
        
        return {
            "message": "Student registered successfully. Proceed to face capture.",
            "student": student
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")

@router.post("/validate-frame")
def validate_frame(payload: ValidateFrameRequest):
    # Verify student exists
    roll_number = payload.rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not registered")

    # Decode base64 image
    try:
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_bytes = base64.b64decode(encoded)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 image data")

    # Validate frame
    valid, reason, face_box = face_service.validate_frame(image_bytes)
    
    if not valid:
        return {"valid": False, "reason": reason}

    # If valid, save it to student dataset directory
    dataset_dir = os.path.join("dataset", roll_number)
    os.makedirs(dataset_dir, exist_ok=True)

    # Count existing images to name the file properly
    existing_files = glob.glob(os.path.join(dataset_dir, "image_*.jpg"))
    img_index = len(existing_files) + 1

    # Don't save more than 120 images (to avoid disk fill-ups)
    if img_index > 120:
        return {
            "valid": True, 
            "reason": "Sufficient images already captured", 
            "faceBox": face_box,
            "count": len(existing_files)
        }

    # Save file
    file_path = os.path.join(dataset_dir, f"image_{img_index:03d}.jpg")
    try:
        with open(file_path, "wb") as f:
            f.write(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File save error: {e}")

    # Update count in DB
    new_count = len(glob.glob(os.path.join(dataset_dir, "image_*.jpg")))
    db_service.update_student_images(roll_number, new_count, status="captured")

    return {
        "valid": True,
        "reason": "Face captured successfully",
        "faceBox": face_box,
        "count": new_count
    }

@router.post("/generate-embeddings")
def generate_embeddings(payload: EmbeddingsRequest):
    roll_number = payload.rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not registered")

    dataset_dir = os.path.join("dataset", roll_number)
    if not os.path.exists(dataset_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No captured dataset found for this student")

    image_paths = glob.glob(os.path.join(dataset_dir, "image_*.jpg"))
    if not image_paths:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dataset is empty. Register face first.")

    embeddings = []
    success_count = 0
    fail_count = 0

    for path in image_paths:
        try:
            # Crop & Align
            aligned_face = face_service.crop_and_align(path)
            # Generate embedding
            emb = face_service.generate_embedding(aligned_face)
            embeddings.append(emb)
            success_count += 1
        except Exception as e:
            fail_count += 1

    if not embeddings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate embeddings from any of the images."
        )

    # Save to DB
    db_service.update_student_embeddings(roll_number, embeddings, status="enrolled")

    # Save embeddings to file system as well for direct offline training compatibility
    embeddings_dir = "embeddings"
    os.makedirs(embeddings_dir, exist_ok=True)
    emb_file = os.path.join(embeddings_dir, f"{roll_number}.npy")
    np.save(emb_file, np.array(embeddings))

    return {
        "message": "Face embedding generation complete. Student enrolled successfully.",
        "rollNumber": roll_number,
        "acceptedImages": success_count,
        "rejectedImages": fail_count,
        "totalEmbeddings": len(embeddings)
    }

@router.get("/{rollNumber}")
def get_student_details(rollNumber: str):
    student = db_service.get_student(rollNumber)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # We omit the raw embeddings array from details to keep payload lightweight
    student.pop("faceEmbeddings", None)
    student.pop("averageEmbedding", None)
    
    return student

class StudentLoginRequest(BaseModel):
    rollNumber: str

@router.post("/login")
def login_student(payload: StudentLoginRequest):
    roll_number = payload.rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found. Verify Roll Number.")
    
    student.pop("faceEmbeddings", None)
    student.pop("averageEmbedding", None)
    return {
        "message": "Login successful",
        "student": student
    }

@router.get("/{rollNumber}/dashboard")
def get_student_dashboard(rollNumber: str):
    import datetime
    roll_number = rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # Seed demo data if first-time user
    db_service.seed_student_demo_data(roll_number)
    
    # Fetch updated student profile
    student = db_service.get_student(roll_number)
    student.pop("faceEmbeddings", None)
    student.pop("averageEmbedding", None)
    
    # Convert datetime fields to ISO strings
    for key in ("createdAt", "updatedAt"):
        if key in student and hasattr(student[key], "isoformat"):
            student[key] = student[key].isoformat()
            
    # Today's scan status
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    today_record = db_service.attendance.find_one({"rollNumber": roll_number, "date": today_str})
    
    today_status = {
        "marked": today_record is not None,
        "timestamp": today_record["timestamp"].isoformat() if today_record and "timestamp" in today_record else None,
        "method": today_record.get("method") if today_record else None,
        "confidence": today_record.get("confidence") if today_record else None
    }
    
    # Fetch all attendance records
    presence_records = db_service.get_student_attendance(roll_number)
    present_dates = {r["date"]: r for r in presence_records}
    
    # Calculate 30-day daily attendance
    today_dt = datetime.date.today()
    daily_attendance = []
    for i in range(30):
        day = today_dt - datetime.timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        day_name = day.strftime("%A")
        
        if day_str in present_dates:
            rec = present_dates[day_str]
            status = "present"
            method = rec.get("method", "face")
            time_val = rec.get("timestamp")
            time_str = time_val.isoformat() if hasattr(time_val, "isoformat") else str(time_val) if time_val else None
        else:
            if day.weekday() >= 5:
                status = "weekend"
                method = None
                time_str = None
            else:
                status = "absent"
                method = None
                time_str = None
                
        daily_attendance.append({
            "date": day_str,
            "dayOfWeek": day_name,
            "status": status,
            "method": method,
            "timestamp": time_str
        })
        
    # Calculate monthly stats
    monthly_stats = []
    months_to_check = []
    temp_date = today_dt
    for _ in range(3):
        month_key = temp_date.strftime("%Y-%m")
        month_name = temp_date.strftime("%B %Y")
        if month_key not in [m[0] for m in months_to_check]:
            months_to_check.append((month_key, month_name))
        # Go to previous month
        temp_date = temp_date.replace(day=1) - datetime.timedelta(days=1)
        
    for m_key, m_name in months_to_check:
        year, month = map(int, m_key.split("-"))
        start_date = datetime.date(year, month, 1)
        if month == 12:
            end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
            
        if year == today_dt.year and month == today_dt.month:
            end_date = today_dt
            
        total_weekdays = 0
        present_days = 0
        curr = start_date
        while curr <= end_date:
            if curr.weekday() < 5:
                total_weekdays += 1
                curr_str = curr.strftime("%Y-%m-%d")
                if curr_str in present_dates:
                    present_days += 1
            curr += datetime.timedelta(days=1)
            
        absent_days = total_weekdays - present_days
        percent = round((present_days / total_weekdays * 100), 1) if total_weekdays > 0 else 0.0
        
        monthly_stats.append({
            "month": m_name,
            "present": present_days,
            "absent": absent_days,
            "total": total_weekdays,
            "percent": percent
        })
        
    # Calculate overall percentage
    total_wd = sum(m["total"] for m in monthly_stats)
    total_pd = sum(m["present"] for m in monthly_stats)
    overall_pct = round((total_pd / total_wd * 100), 1) if total_wd > 0 else 0.0
    
    # Fetch Assessments
    assessments = db_service.get_student_assessments(roll_number)
    
    # Streak
    streak = db_service.get_attendance_streak(roll_number)
    
    return {
        "student": student,
        "todayStatus": today_status,
        "overallAttendancePercent": overall_pct,
        "streak": streak,
        "attendanceStats": {
            "presentDays": total_pd,
            "absentDays": total_wd - total_pd,
            "totalDays": total_wd,
            "percentage": overall_pct,
            "status": "Good" if overall_pct >= 85 else "Warning" if overall_pct >= 75 else "Critical"
        },
        "monthlyStats": monthly_stats,
        "dailyAttendance": daily_attendance,
        "assessments": assessments
    }
