import unittest
import numpy as np
import cv2
import os
import base64
from fastapi.testclient import TestClient
from app import app
from services.db_service import db_service
from services.face_service import face_service

class TestSmartClassBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # We use a test client for API testing
        cls.client = TestClient(app)
        cls.test_roll = "TEST999"
        
        # Clean up any existing test student in MongoDB
        if db_service.students is not None:
            db_service.students.delete_one({"rollNumber": cls.test_roll})
            
    @classmethod
    def tearDownClass(cls):
        # Clean up database records and folders
        if db_service.students is not None:
            db_service.students.delete_one({"rollNumber": cls.test_roll})
        
        dataset_dir = os.path.join("dataset", cls.test_roll)
        if os.path.exists(dataset_dir):
            import shutil
            shutil.rmtree(dataset_dir, ignore_errors=True)

    def test_01_db_connection(self):
        """Test if database is connected."""
        self.assertIsNotNone(db_service.db, "Database is not connected")
        self.assertIsNotNone(db_service.students, "Students collection is not loaded")

    def test_02_register_student(self):
        """Test student registration endpoint."""
        payload = {
            "fullName": "Test User",
            "rollNumber": self.test_roll,
            "email": "test.user@college.edu",
            "department": "Engineering",
            "branch": "Computer Science",
            "year": 4,
            "section": "B"
        }
        response = self.client.post("/students/register", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("student", data)
        self.assertEqual(data["student"]["rollNumber"], self.test_roll)
        self.assertEqual(data["student"]["status"], "registered")

    def test_03_duplicate_registration(self):
        """Test registering a student with a duplicate roll number."""
        payload = {
            "fullName": "Another User",
            "rollNumber": self.test_roll,
            "email": "another@college.edu",
            "department": "Engineering",
            "branch": "IT",
            "year": 2,
            "section": "A"
        }
        response = self.client.post("/students/register", json=payload)
        self.assertEqual(response.status_code, 400) # Should be bad request

    def test_04_query_student(self):
        """Test retrieving student details."""
        response = self.client.get(f"/students/{self.test_roll}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["rollNumber"], self.test_roll)
        self.assertEqual(data["fullName"], "Test User")

    def test_05_validate_invalid_frame(self):
        """Test sending a blank black frame (no face)."""
        # Create a black 640x480 image
        black_img = np.zeros((480, 640, 3), dtype=np.uint8)
        _, encoded_img = cv2.imencode('.jpg', black_img)
        base64_data = "data:image/jpeg;base64," + base64.b64encode(encoded_img).decode('utf-8')
        
        payload = {
            "rollNumber": self.test_roll,
            "pose": "straight",
            "image": base64_data
        }
        
        response = self.client.post("/students/validate-frame", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["valid"])
        self.assertEqual(data["reason"], "Lighting too dark. Turn on more lights.")

    def test_06_validate_blurry_frame(self):
        """Test sending a gray flat frame (bright but no detail, hence blurry)."""
        # Create a light gray 640x480 image
        gray_img = np.ones((480, 640, 3), dtype=np.uint8) * 128
        _, encoded_img = cv2.imencode('.jpg', gray_img)
        base64_data = "data:image/jpeg;base64," + base64.b64encode(encoded_img).decode('utf-8')
        
        payload = {
            "rollNumber": self.test_roll,
            "pose": "straight",
            "image": base64_data
        }
        
        response = self.client.post("/students/validate-frame", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["valid"])
        self.assertEqual(data["reason"], "No face detected. Look at the camera.")

if __name__ == "__main__":
    unittest.main()
