from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel

class Admin(BaseModel):
    __tablename__ = "admins"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id = Column(String, unique=True, nullable=False)
    hire_date = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="admin_profile")
    system_settings = relationship("SystemSetting", back_populates="admin")
