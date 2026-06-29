from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SubjectBase(BaseModel):
    name: str
    code: str
    credit_hours: int

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    credit_hours: Optional[int] = None

class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True