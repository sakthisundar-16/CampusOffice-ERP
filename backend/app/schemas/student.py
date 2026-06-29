from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class StudentBase(BaseModel):
    roll_number: str
    admission_date: datetime
    current_semester: Optional[int] = None
    department_id: Optional[int] = None
    gpa: Optional[str] = None
    quota: str = "Govt Quota"
    transport_route: Optional[str] = None
    transport_fee: float = 0.0

class StudentCreate(StudentBase):
    user_id: int

class StudentUpdate(BaseModel):
    roll_number: Optional[str] = None
    admission_date: Optional[datetime] = None
    current_semester: Optional[int] = None
    department_id: Optional[int] = None
    gpa: Optional[str] = None
    quota: Optional[str] = None
    transport_route: Optional[str] = None
    transport_fee: Optional[float] = None

class StudentResponse(StudentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentFullCreate(BaseModel):
    user: dict
    roll_number: str
    admission_date: str
    current_semester: Optional[int] = None
    department_id: Optional[int] = None
    quota: str = "Govt Quota"
    transport_route: Optional[str] = None
    transport_fee: float = 0.0