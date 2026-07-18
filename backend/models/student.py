from pydantic import BaseModel, Field, field_validator
import re

class StudentRegisterRequest(BaseModel):
    fullName: str = Field(..., description="Full name of the student")
    rollNumber: str = Field(..., description="Unique roll number of the student")
    email: str = Field(..., description="Email address")
    department: str = Field(..., description="College department (e.g. Engineering)")
    branch: str = Field(..., description="Specialization branch (e.g. CSE)")
    year: int = Field(..., ge=1, le=5, description="Academic year (1 to 5)")
    section: str = Field(..., description="Section letter (e.g. A, B, C)")

    @field_validator("rollNumber")
    @classmethod
    def validate_roll_number(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z0-9\-]{3,20}$", v):
            raise ValueError("Roll Number must be alphanumeric and between 3-20 characters long")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("fullName", "department", "branch", "section")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty or only whitespace")
        return v.strip()
