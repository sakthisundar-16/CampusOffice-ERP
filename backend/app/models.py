from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from .database import Base
import enum
from datetime import datetime

class Role(str, enum.Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="student", index=True)
    student_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    photo = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    student_profile = relationship("Student", uselist=False, back_populates="user")
    staff_profile = relationship("Staff", uselist=False, back_populates="user")
    admin_profile = relationship("Admin", uselist=False, back_populates="user")
    payment_requests = relationship("PaymentRequest", back_populates="user")
    results = relationship("Result", back_populates="user")
    bonafide_requests = relationship("BonafideRequest", foreign_keys="BonafideRequest.user_id")
    approved_bonafides = relationship("BonafideRequest", foreign_keys="BonafideRequest.approved_by")
    notifications = relationship("Notification", back_populates="user")
    department = relationship("Department", back_populates="users")

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    students = relationship("Student", back_populates="department")
    staffs = relationship("Staff", back_populates="department")
    users = relationship("User", back_populates="department")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    roll_number = Column(String, unique=True, nullable=False)
    admission_date = Column(DateTime, nullable=False)
    current_semester = Column(Integer)
    department_id = Column(Integer, ForeignKey("departments.id"))
    gpa = Column(String)
    
    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    staff_id = Column(String, unique=True, nullable=False)
    hire_date = Column(DateTime, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    
    user = relationship("User", back_populates="staff_profile")
    department = relationship("Department", back_populates="staffs")

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    employee_id = Column(String, unique=True, nullable=False)
    hire_date = Column(DateTime, nullable=False)
    
    user = relationship("User", back_populates="admin_profile")

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=False)

class FeeStructure(Base):
    __tablename__ = "fee_structures"
    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    fee_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)

class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id"), nullable=True)
    amount_paid = Column(Float, nullable=True)
    payment_date = Column(DateTime)
    payment_proof = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    upi_reference = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    receipt_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="payment_requests")
    verifier = relationship("User", foreign_keys=[verified_by])
    fee_structure = relationship("FeeStructure")

class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    semester = Column(String)
    gpa = Column(Float)
    total_marks = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    grade = Column(String, nullable=True)
    pass_fail = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="results")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    credit_hours = Column(Integer, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    recipient_type = Column(String)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class BonafideRequest(Base):
    __tablename__ = "bonafide_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    purpose = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    required_date = Column(DateTime, nullable=True)
    additional_notes = Column(Text, nullable=True)
    status = Column(String, default="pending")
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    certificate_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="bonafide_requests")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_bonafides")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LoginHistory(Base):
    __tablename__ = "login_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RequestType(str, enum.Enum):
    PAYMENT = "payment"
    DOCUMENT = "document"
    RESULT = "result"
    PROFILE_UPDATE = "profile_update"
    CERTIFICATE = "certificate"

class RequestStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    PROCESSING = "processing"
    APPROVED = "approved"
    GENERATED = "generated"
    COMPLETED = "completed"
    REJECTED = "rejected"
    RETURNED = "returned"

class UnifiedRequest(Base):
    __tablename__ = "unified_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String, unique=True, nullable=False, index=True)
    request_type = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default=RequestStatus.SUBMITTED.value, index=True)
    priority = Column(String, default="normal")
    reference_id = Column(Integer, nullable=True, index=True)  # Links to payment_request.id, document_request.id, etc.
    reference_type = Column(String, nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    academic_year = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON for additional data
    
    user = relationship("User", foreign_keys=[user_id])
    processor = relationship("User", foreign_keys=[processed_by])
    department = relationship("Department")
    semester = relationship("Semester")

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

class ActivityHistory(Base):
    __tablename__ = "activity_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_type = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reference_number = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User")

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
    metadata = Column(Text, nullable=True)  # JSON for additional fields
    
    document_request = relationship("BonafideRequest")
    generator = relationship("User")

class SystemHealth(Base):
    __tablename__ = "system_health"
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False, unique=True)
    status = Column(String, default="healthy")
    last_check = Column(DateTime, default=datetime.utcnow)
    response_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)
