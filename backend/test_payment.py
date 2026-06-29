import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, PaymentRequest, PaymentStatus, Department, FeeStructure, Semester, Student, Role, UnifiedRequest, RequestType, RequestStatus
from app.services.workflow_automation_service import WorkflowAutomationService
from datetime import datetime

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

dept = Department(name="Computer Science", code="CS", is_active=True)
db.add(dept)
db.commit()

user = User(email="test@test.com", password_hash="123", full_name="Test Student", role=Role.STUDENT, is_active=True, department_id=dept.id)
staff = User(email="staff@test.com", password_hash="123", full_name="Staff", role=Role.STAFF, is_active=True, department_id=dept.id)
db.add(user)
db.add(staff)
db.commit()

student = Student(user_id=user.id, roll_number="123", admission_date=datetime.now(), quota="Govt Quota")
fee_struct = FeeStructure(department_id=dept.id, fee_name="Tuition", amount=1000.0)
semester = Semester(semester_number=1)
db.add(student)
db.add(fee_struct)
db.add(semester)
db.commit()

payment = PaymentRequest(
    request_id="REQ123",
    user_id=user.id,
    department_id=dept.id,
    fee_structure_id=fee_struct.id,
    semester_id=semester.id,
    amount_paid=1000.0,
    status=PaymentStatus.PENDING
)
db.add(payment)
db.commit()

unified = UnifiedRequest(
    request_number="REQ123",
    request_type=RequestType.PAYMENT,
    user_id=user.id,
    status=RequestStatus.PENDING if hasattr(RequestStatus, "PENDING") else RequestStatus.SUBMITTED,
    reference_id=payment.id,
    reference_type="payment_request"
)
db.add(unified)
db.commit()

service = WorkflowAutomationService(db)
try:
    service.execute_payment_approved_workflow(payment_id=payment.id, approved_by=staff.id, ip_address="127.0.0.1", user_agent="test")
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
