from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class SystemSetting(BaseModel):
    __tablename__ = "system_settings"

    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    setting_key = Column(String, unique=True, nullable=False)
    setting_value = Column(String, nullable=True)

    admin = relationship("Admin", back_populates="system_settings")
