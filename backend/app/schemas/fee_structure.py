from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FeeStructureBase(BaseModel):
    semester_id: int
    fee_name: str
    amount: float
    due_date: datetime

class FeeStructureCreate(FeeStructureBase):
    pass

class FeeStructureUpdate(BaseModel):
    semester_id: Optional[int] = None
    fee_name: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[datetime] = None

class FeeStructureResponse(FeeStructureBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True