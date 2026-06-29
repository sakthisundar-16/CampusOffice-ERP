from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ResultBase(BaseModel):
    user_id: int
    semester: str
    gpa: float
    total_marks: Optional[float] = None
    percentage: Optional[float] = None
    grade: Optional[str] = None
    pass_fail: Optional[str] = None
    details: Optional[str] = None

class ResultCreate(ResultBase):
    pass

class ResultUpdate(BaseModel):
    semester: Optional[str] = None
    gpa: Optional[float] = None
    total_marks: Optional[float] = None
    percentage: Optional[float] = None
    grade: Optional[str] = None
    pass_fail: Optional[str] = None
    details: Optional[str] = None

class ResultResponse(ResultBase):
    id: int
    published_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True