from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from .base import Base

class SystemHealth(Base):
    __tablename__ = "system_health"
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False, unique=True)
    status = Column(String, default="healthy")
    last_check = Column(DateTime, default=datetime.utcnow)
    response_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    health_metadata = Column(Text, nullable=True)
