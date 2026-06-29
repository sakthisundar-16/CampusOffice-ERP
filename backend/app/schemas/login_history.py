from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LoginHistoryBase(BaseModel):
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class LoginHistoryCreate(LoginHistoryBase):
    pass

class LoginHistoryResponse(LoginHistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True