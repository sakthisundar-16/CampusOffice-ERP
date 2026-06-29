from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    id = Column(Integer, primary_key=True, index=True)
    certificate_number = Column(String, unique=True, nullable=False, index=True)
    document_request_id = Column(Integer, ForeignKey("bonafide_requests.id"), nullable=True)
    verification_code = Column(String, unique=True, nullable=False, index=True)
    verification_url = Column(String, nullable=True)
    qr_code_path = Column(String, nullable=True)
    generated_timestamp = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    version_number = Column(Integer, default=1)
    digital_signature = Column(Text, nullable=True)
    download_counter = Column(Integer, default=0)
    last_download_date = Column(DateTime, nullable=True)
    archived_status = Column(Boolean, default=False)
    archived_at = Column(DateTime, nullable=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String, nullable=True)
    doc_metadata = Column(Text, nullable=True)
    
    document_request = relationship("BonafideRequest")
    generator = relationship("User")
