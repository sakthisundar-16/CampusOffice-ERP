from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AdminBase(BaseModel):
    employee_id: str
    hire_date: datetime

class AdminCreate(AdminBase):
    user_id: int

class AdminUpdate(BaseModel):
    employee_id: Optional[str] = None
    hire_date: Optional[datetime] = None

class AdminResponse(AdminBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True