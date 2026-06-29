from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SemesterBase(BaseModel):
    name: str
    academic_year: str
    start_date: datetime
    end_date: datetime
    is_current: bool = False

class SemesterCreate(SemesterBase):
    pass

class SemesterUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: Optional[bool] = None

class SemesterResponse(SemesterBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True