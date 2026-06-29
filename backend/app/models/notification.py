from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from datetime import datetime

class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    recipient_type = Column(String, nullable=True)
    category = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")

Index('ix_notifications_user_unread', Notification.user_id, Notification.is_read)
