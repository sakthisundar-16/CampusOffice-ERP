from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentTypeBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    requires_approval: bool = True
    validity_days: Optional[int] = None
    certificate_prefix: str
    certificate_title: str
    template_fields: Optional[str] = None
    allowed_purposes: Optional[str] = None

class DocumentTypeCreate(DocumentTypeBase):
    pass

class DocumentTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    requires_approval: Optional[bool] = None
    validity_days: Optional[int] = None
    certificate_prefix: Optional[str] = None
    certificate_title: Optional[str] = None
    template_fields: Optional[str] = None
    allowed_purposes: Optional[str] = None

class DocumentTypeResponse(DocumentTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
