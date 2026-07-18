from pydantic import BaseModel, Field
from typing import Optional


class MarkFaceAttendanceRequest(BaseModel):
    image: str  # Base64 encoded JPEG image from webcam


class MarkManualAttendanceRequest(BaseModel):
    rollNumber: str = Field(..., description="Roll number of the student to mark present")
    note: Optional[str] = Field(None, description="Optional note for manual marking")


class AttendanceRecord(BaseModel):
    rollNumber: str
    fullName: str
    department: str
    branch: str
    year: int
    section: str
    date: str           # YYYY-MM-DD
    timestamp: str      # ISO datetime string
    method: str         # "face" or "manual"
    confidence: float   # 0.0 - 1.0; 1.0 for manual
    status: str         # "present"
