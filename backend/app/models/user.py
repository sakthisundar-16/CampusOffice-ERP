from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    student_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="admin_users")
    student_profile = relationship("Student", uselist=False, back_populates="user", cascade="all, delete-orphan")
    staff_profile = relationship("Staff", uselist=False, back_populates="user", cascade="all, delete-orphan")
    admin_profile = relationship("Admin", uselist=False, back_populates="user", cascade="all, delete-orphan")
    payment_requests = relationship("PaymentRequest", back_populates="user", foreign_keys="[PaymentRequest.user_id]", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="user", cascade="all, delete-orphan")
    bonafide_requests = relationship("BonafideRequest", back_populates="user", foreign_keys="[BonafideRequest.user_id]", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    login_history = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
