from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class RequestTimeline(Base):
    __tablename__ = "request_timeline"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("unified_requests.id"), nullable=False, index=True)
    status = Column(String, nullable=False)
    stage = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    request = relationship("UnifiedRequest")
    actor = relationship("User")
