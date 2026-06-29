from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class StaffBase(BaseModel):
    staff_id: str
    hire_date: datetime
    department_id: int

class StaffCreate(StaffBase):
    user_id: int

class StaffUpdate(BaseModel):
    staff_id: Optional[str] = None
    hire_date: Optional[datetime] = None
    department_id: Optional[int] = None

class StaffResponse(StaffBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StaffFullCreate(BaseModel):
    user: dict
    staff_id: str
    hire_date: str
    department_id: Optional[int] = None