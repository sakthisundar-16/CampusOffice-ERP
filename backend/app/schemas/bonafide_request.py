from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BonafideRequestBase(BaseModel):
    user_id: Optional[int] = None
    purpose: Optional[str] = None
    reason: Optional[str] = None
    required_date: Optional[datetime] = None
    additional_notes: Optional[str] = None
    status: str = "pending"

class BonafideRequestCreate(BonafideRequestBase):
    pass

class BonafideRequestUpdate(BaseModel):
    purpose: Optional[str] = None
    reason: Optional[str] = None
    required_date: Optional[datetime] = None
    additional_notes: Optional[str] = None
    status: Optional[str] = None
    approved_by: Optional[int] = None
    remarks: Optional[str] = None
    certificate_path: Optional[str] = None

class BonafideRequestResponse(BonafideRequestBase):
    id: int
    approved_by: Optional[int] = None
    remarks: Optional[str] = None
    certificate_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True