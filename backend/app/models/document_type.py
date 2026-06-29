from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class DocumentType(BaseModel):
    __tablename__ = "document_types"

    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=True)
    validity_days = Column(Integer, nullable=True)
    certificate_prefix = Column(String, nullable=False)
    certificate_title = Column(String, nullable=False)
    template_fields = Column(Text, nullable=True)
    allowed_purposes = Column(Text, nullable=True)

    document_requests = relationship("DocumentRequest", viewonly=True)
