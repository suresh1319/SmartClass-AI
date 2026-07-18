import unittest
from fastapi.testclient import TestClient
from app import app
from services.db_service import db_service

class TestStudentDashboardAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_roll = "DASH999"
        
        # Clean up any existing test student in MongoDB
        if db_service.students is not None:
            db_service.students.delete_one({"rollNumber": cls.test_roll})
            if db_service.db is not None:
                db_service.db["assessments"].delete_many({"rollNumber": cls.test_roll})
            db_service.attendance.delete_many({"rollNumber": cls.test_roll})
            
        # Register a test student
        payload = {
            "fullName": "Dash User",
            "rollNumber": cls.test_roll,
            "email": "dash.user@college.edu",
            "department": "Engineering",
            "branch": "Computer Science",
            "year": 3,
            "section": "A"
        }
        response = cls.client.post("/students/register", json=payload)
        assert response.status_code == 201

    @classmethod
    def tearDownClass(cls):
        if db_service.students is not None:
            db_service.students.delete_one({"rollNumber": cls.test_roll})
            if db_service.db is not None:
                db_service.db["assessments"].delete_many({"rollNumber": cls.test_roll})
            db_service.attendance.delete_many({"rollNumber": cls.test_roll})

    def test_login_successful(self):
        response = self.client.post("/students/login", json={"rollNumber": self.test_roll})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["student"]["rollNumber"], self.test_roll)
        self.assertEqual(data["message"], "Login successful")

    def test_login_not_found(self):
        response = self.client.post("/students/login", json={"rollNumber": "NONEXISTENT"})
        self.assertEqual(response.status_code, 404)

    def test_dashboard_retrieval_and_seeding(self):
        # Retrieve dashboard which should trigger seeding of demo data
        response = self.client.get(f"/students/{self.test_roll}/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify student details
        self.assertEqual(data["student"]["rollNumber"], self.test_roll)
        
        # Verify assessments were seeded
        self.assertGreater(len(data["assessments"]), 0)
        self.assertEqual(data["assessments"][0]["rollNumber"], self.test_roll)
        
        # Verify daily attendance records were seeded
        self.assertGreater(len(data["dailyAttendance"]), 0)
        
        # Verify todayStatus has correct structure
        self.assertIn("marked", data["todayStatus"])
        self.assertIn("timestamp", data["todayStatus"])
        
        # Verify overall percentage and streak
        self.assertIn("overallAttendancePercent", data)
        self.assertIn("streak", data)

if __name__ == "__main__":
    unittest.main()
