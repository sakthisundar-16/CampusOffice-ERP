from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel

class LoginHistory(BaseModel):
    __tablename__ = "login_history"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    login_time = Column(DateTime, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    user = relationship("User", back_populates="login_history")
