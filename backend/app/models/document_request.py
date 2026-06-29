from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from datetime import datetime

class DocumentRequest(BaseModel):
    __tablename__ = "document_requests"

    request_number = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    purpose = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    required_date = Column(DateTime, nullable=True)
    additional_notes = Column(Text, nullable=True)
    attachment_path = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_remarks = Column(Text, nullable=True)
    certificate_path = Column(String, nullable=True)
    certificate_number = Column(String, unique=True, nullable=True, index=True)
    verification_code = Column(String, nullable=True, index=True)
    issued_at = Column(DateTime, nullable=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    downloaded_at = Column(DateTime, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document_type = relationship("DocumentType")
    requester = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    issuer = relationship("User", foreign_keys=[issued_by])

Index('ix_document_requests_status_created', DocumentRequest.status, DocumentRequest.created_at.desc())

class CertificateArchive(BaseModel):
    __tablename__ = "certificate_archives"

    certificate_number = Column(String, unique=True, nullable=False)
    request_id = Column(Integer, ForeignKey("document_requests.id"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    issued_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=False)
    verification_code = Column(String, nullable=True)
