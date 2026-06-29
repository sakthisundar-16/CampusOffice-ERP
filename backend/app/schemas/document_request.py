from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentRequestBase(BaseModel):
    document_type_id: int
    purpose: Optional[str] = None
    reason: Optional[str] = None
    required_date: Optional[datetime] = None
    additional_notes: Optional[str] = None
    attachment: Optional[str] = None

class DocumentRequestCreate(DocumentRequestBase):
    pass

class DocumentRequestUpdate(BaseModel):
    status: Optional[str] = None
    review_remarks: Optional[str] = None

class DocumentRequestReview(BaseModel):
    status: str
    remarks: str

class DocumentRequestResponse(DocumentRequestBase):
    id: int
    request_number: str
    user_id: int
    status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_remarks: Optional[str] = None
    certificate_path: Optional[str] = None
    certificate_number: Optional[str] = None
    verification_code: Optional[str] = None
    issued_at: Optional[datetime] = None
    issued_by: Optional[int] = None
    downloaded_at: Optional[datetime] = None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    document_type: Optional[dict] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    department_code: Optional[str] = None
    semester: Optional[int] = None
    reviewer_name: Optional[str] = None
    issuer_name: Optional[str] = None

    class Config:
        from_attributes = True

class CertificateArchiveResponse(BaseModel):
    id: int
    certificate_number: str
    request_id: int
    document_type_id: int
    user_id: int
    issued_by: Optional[int] = None
    issued_at: Optional[datetime] = None
    archived_at: datetime
    file_path: str
    verification_code: Optional[str] = None

    class Config:
        from_attributes = True
