import os
import uuid
import re
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import PaymentRequest, FeeStructure, Semester, User, Department, Notification, AuditLog, PaymentStatus, Student
from ..schemas import PaymentRequestCreate, PaymentRequestUpdate
from ..core.config import settings

UPLOAD_DIR = f"{settings.UPLOAD_DIR}/payments"
os.makedirs(UPLOAD_DIR, exist_ok=True)

RECEIPT_DIR = settings.PDF_STORAGE_PATH
os.makedirs(RECEIPT_DIR, exist_ok=True)

CURRENCY_SYMBOL = "Rs."
PAYMENT_TOLERANCE = 0.01


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def _get_department_code(self, user_id: int) -> str:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.department_id:
            raise ValueError("Student department not found. Please contact administration.")
        dept = self.db.query(Department).filter(Department.id == user.department_id).first()
        if not dept:
            raise ValueError("Department not found. Please contact administration.")
        return dept.code

    def _get_semester_fee_total(self, user_id: int, semester_id: int) -> float:
        student = self.db.query(User).filter(User.id == user_id).first()
        if not student or not student.student_profile:
            return 0.0
        fee_structures = self.db.query(FeeStructure).filter(
            FeeStructure.semester_id == semester_id,
            FeeStructure.is_active == True
        ).all()
        return sum(f.amount for f in fee_structures)

    def _get_semester_paid_total(self, user_id: int, semester_id: int) -> float:
        paid_payments = self.db.query(PaymentRequest).filter(
            PaymentRequest.user_id == user_id,
            PaymentRequest.semester_id == semester_id,
            PaymentRequest.status == PaymentStatus.COMPLETED
        ).all()
        return sum(p.amount_paid for p in paid_payments if p.amount_paid)

    def _validate_transaction_id_unique(self, transaction_id: str, exclude_payment_id: Optional[int] = None):
        query = self.db.query(PaymentRequest).filter(PaymentRequest.transaction_id == transaction_id)
        if exclude_payment_id:
            query = query.filter(PaymentRequest.id != exclude_payment_id)
        # Also exclude the original request if we're resubmitting
        existing = query.first()
        if existing:
            raise ValueError(f"Transaction ID '{transaction_id}' has already been used in payment request {existing.request_id}. Please use a unique transaction ID.")

    def _validate_payment(self, user_id: int, semester_id: int, amount_paid: float, transaction_id: str):
        if amount_paid <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        if not re.match(r'^[A-Za-z0-9\-]+$', transaction_id):
            raise ValueError("Transaction ID must contain only letters, numbers, and hyphens.")

        if len(transaction_id) > 100:
            raise ValueError("Transaction ID must not exceed 100 characters.")

        self._validate_transaction_id_unique(transaction_id)

        semester = self.db.query(Semester).filter(Semester.id == semester_id).first()
        if not semester:
            raise ValueError("Invalid semester selected.")

        existing_pending = self.db.query(PaymentRequest).filter(
            PaymentRequest.user_id == user_id,
            PaymentRequest.semester_id == semester_id,
            PaymentRequest.status == PaymentStatus.PENDING
        ).first()
        if existing_pending:
            raise ValueError("You already have a pending payment request for this semester. Please wait for it to be processed.")

        total_fee = self._get_semester_fee_total(user_id, semester_id)
        if total_fee <= 0:
            raise ValueError("No fee structure defined for this semester. Please contact the administration.")

        already_paid = self._get_semester_paid_total(user_id, semester_id)
        pending_amount = total_fee - already_paid

        if amount_paid > pending_amount + PAYMENT_TOLERANCE:
            raise ValueError(
                f"Over payment not allowed. Pending amount for this semester is {CURRENCY_SYMBOL} {pending_amount:.2f}."
            )

    def _generate_request_id(self, user_id: int, department_code: str, semester_id: int) -> str:
        year = datetime.utcnow().year
        semester = self.db.query(Semester).filter(Semester.id == semester_id).first()
        semester_label = semester.name if semester else "UNK"
        dept_code = re.sub(r'[^A-Z0-9]', '', department_code.upper())[:3]

        latest = self.db.query(PaymentRequest).filter(
            PaymentRequest.request_id.like(f"PAYREQ-{year}-{dept_code}-%")
        ).order_by(PaymentRequest.id.desc()).first()

        if latest:
            last_num = int(latest.request_id.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1

        return f"PAYREQ-{year}-{dept_code}-{new_num:06d}"

    def _generate_receipt_number(self, user_id: int, department_code: str) -> str:
        year = datetime.utcnow().year
        dept_code = re.sub(r'[^A-Z0-9]', '', department_code.upper())[:3]

        latest = self.db.query(PaymentRequest).filter(
            PaymentRequest.receipt_number.like(f"REC-{year}-{dept_code}-%")
        ).order_by(PaymentRequest.id.desc()).first()

        if latest and latest.receipt_number:
            last_num = int(latest.receipt_number.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1

        return f"REC-{year}-{dept_code}-{new_num:06d}"

    def create_payment_request(self, payment_in: PaymentRequestCreate, user_id: int, file=None) -> PaymentRequest:
        semester_id = payment_in.semester_id
        amount_paid = payment_in.amount_paid
        transaction_id = payment_in.transaction_id

        self._validate_payment(user_id, semester_id, amount_paid, transaction_id)

        user = self.db.query(User).filter(User.id == user_id).first()
        department_code = "GEN"
        academic_year = None
        if user:
            if user.department_id:
                dept = self.db.query(Department).filter(Department.id == user.department_id).first()
                if dept:
                    department_code = dept.code
            if semester_id:
                semester = self.db.query(Semester).filter(Semester.id == semester_id).first()
                if semester:
                    academic_year = semester.academic_year

        request_id = self._generate_request_id(user_id, department_code, semester_id)

        payment_dict = {
            "request_id": request_id,
            "user_id": user_id,
            "department_id": user.department_id if user else None,
            "fee_structure_id": None,
            "semester_id": semester_id,
            "academic_year": academic_year,
            "amount_paid": amount_paid,
            "payment_date": datetime.utcnow(),
            "transaction_id": transaction_id,
            "bank_name": payment_in.bank_name,
            "upi_reference": payment_in.upi_reference,
            "status": PaymentStatus.PENDING.value,
        }

        if file:
            file_extension = file.filename.split(".")[-1].lower()
            if file_extension not in ["jpg", "jpeg", "png", "pdf"]:
                raise ValueError("Only jpg, jpeg, png, and pdf files are allowed.")

            file_content = file.file.read()
            file_size = len(file_content)
            if file_size > 5 * 1024 * 1024:
                raise ValueError("File size must be less than 5MB.")

            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            with open(file_path, "wb") as f:
                f.write(file_content)
            payment_dict["payment_proof"] = file_path

        db_payment = PaymentRequest(**payment_dict)
        self.db.add(db_payment)
        self.db.commit()
        self.db.refresh(db_payment)

        self._create_notification(user_id, "Payment Request Submitted", f"Your payment request {request_id} for {CURRENCY_SYMBOL} {amount_paid} has been submitted and is pending verification.")
        self._create_audit_log(user_id, "PAYMENT_REQUEST_CREATE", f"Payment request created with ID {request_id}, transaction {transaction_id}, amount {amount_paid}")

        return db_payment

    def get_payments_by_user(self, user_id: int) -> List[PaymentRequest]:
        return self.db.query(PaymentRequest).filter(PaymentRequest.user_id == user_id).order_by(PaymentRequest.created_at.desc()).all()

    def get_all_payments(self, skip: int = 0, limit: int = 100) -> List[PaymentRequest]:
        return self.db.query(PaymentRequest).offset(skip).limit(limit).all()

    def get_payment_by_id(self, payment_id: int) -> Optional[PaymentRequest]:
        return self.db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()

    def get_payment_by_request_id(self, request_id: str) -> Optional[PaymentRequest]:
        return self.db.query(PaymentRequest).filter(PaymentRequest.request_id == request_id).first()

    def approve_payment_request(self, payment_id: int, staff_id: int, ip_address: str, user_agent: str) -> PaymentRequest:
        payment = self.db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
        if not payment:
            raise ValueError("Payment request not found")

        if payment.status != PaymentStatus.PENDING.value:
            raise ValueError(f"Payment request is already {payment.status} and cannot be approved again.")

        existing_completed = self.db.query(PaymentRequest).filter(
            PaymentRequest.user_id == payment.user_id,
            PaymentRequest.semester_id == payment.semester_id,
            PaymentRequest.status == PaymentStatus.COMPLETED.value,
            PaymentRequest.id != payment.id
        ).first()
        if existing_completed:
            if (payment.amount_paid or 0) >= 0.01:
                pass

        total_fee = self._get_semester_fee_total(payment.user_id, payment.semester_id)
        already_paid = self._get_semester_paid_total(payment.user_id, payment.semester_id)
        remaining = total_fee - already_paid

        if payment.amount_paid > remaining + PAYMENT_TOLERANCE:
            raise ValueError(f"Payment amount {CURRENCY_SYMBOL} {payment.amount_paid} exceeds remaining balance {CURRENCY_SYMBOL} {remaining:.2f} for this semester.")

        staff = self.db.query(User).filter(User.id == staff_id).first()
        verifier_name = staff.full_name if staff else "Office Staff"

        user = self.db.query(User).filter(User.id == payment.user_id).first()
        dept_code = "GEN"
        dept_name = "N/A"
        if user and user.department_id:
            dept = self.db.query(Department).filter(Department.id == user.department_id).first()
            if dept:
                dept_code = re.sub(r'[^A-Z0-9]', '', dept.code.upper())[:3]
                dept_name = dept.code

        receipt_number = self._generate_receipt_number(payment.user_id, dept_code)

        receipt_filename = f"receipt_{payment.id}_{int(datetime.utcnow().timestamp())}.pdf"
        receipt_path = os.path.join(RECEIPT_DIR, receipt_filename)

        student = self.db.query(Student).filter(Student.user_id == payment.user_id).first()
        quota = student.quota if student else "Govt Quota"

        receipt_data = {
            "id": payment.id,
            "request_id": payment.request_id,
            "receipt_number": receipt_number,
            "student_name": user.full_name if user else "N/A",
            "roll_number": user.student_id if user else "N/A",
            "department": dept_name,
            "quota": quota,
            "fee_name": payment.fee_structure.fee_name if payment.fee_structure else "Fee Payment",
            "amount_paid": payment.amount_paid,
            "transaction_id": payment.transaction_id,
            "payment_date": payment.payment_date.strftime("%Y-%m-%d") if payment.payment_date else datetime.now().strftime("%Y-%m-%d"),
            "verified_by": verifier_name,
            "remaining_balance": max(0, remaining - (payment.amount_paid or 0)),
        }

        from ..services.pdf_service import PDFService
        PDFService.generate_fee_receipt(receipt_data, receipt_path)

        payment.status = PaymentStatus.COMPLETED.value
        payment.verified_by = staff_id
        payment.verified_at = datetime.utcnow()
        payment.receipt_number = receipt_number
        payment.receipt_path = receipt_path

        self.db.commit()
        self.db.refresh(payment)

        remaining_after = max(0, total_fee - already_paid - (payment.amount_paid or 0))

        self._create_notification(
            payment.user_id,
            "Payment Approved",
            f"Your payment request {payment.request_id} has been approved. Receipt {receipt_number} has been generated. Remaining balance: {CURRENCY_SYMBOL} {remaining_after:.2f}."
        )

        self._create_audit_log(
            user_id=payment.user_id,
            action="PAYMENT_APPROVE",
            details=f"Payment request {payment.request_id} approved by staff {staff_id}. Receipt {receipt_number} generated. Amount: {CURRENCY_SYMBOL} {payment.amount_paid}. Remaining balance: {CURRENCY_SYMBOL} {remaining_after:.2f}.",
            ip_address=ip_address,
            user_agent=user_agent
        )

        self._create_audit_log(
            user_id=staff_id,
            action="PAYMENT_APPROVE",
            details=f"Staff {staff_id} approved payment request {payment.request_id}. Receipt {receipt_number} generated.",
            ip_address=ip_address,
            user_agent=user_agent
        )

        return payment

    def reject_payment_request(self, payment_id: int, staff_id: int, remarks: str, ip_address: str, user_agent: str, allow_resubmit: bool = True) -> PaymentRequest:
        payment = self.db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
        if not payment:
            raise ValueError("Payment request not found")

        if payment.status != PaymentStatus.PENDING.value:
            raise ValueError(f"Payment request is already {payment.status} and cannot be rejected again.")

        if not remarks or not remarks.strip():
            raise ValueError("Remarks are required for rejection.")

        payment.status = PaymentStatus.REJECTED.value
        payment.verified_by = staff_id
        payment.verified_at = datetime.utcnow()
        payment.remarks = remarks.strip()

        if allow_resubmit:
            payment.is_resubmitted = True
            payment.original_request_id = payment.id

        self.db.commit()
        self.db.refresh(payment)

        if allow_resubmit:
            self._create_notification(
                payment.user_id,
                "Payment Rejected",
                f"Your payment request {payment.request_id} was rejected. Reason: {remarks.strip()}. You may resubmit your payment."
            )
        else:
            self._create_notification(
                payment.user_id,
                "Payment Rejected",
                f"Your payment request {payment.request_id} was rejected. Reason: {remarks.strip()}."
            )

        self._create_audit_log(
            user_id=payment.user_id,
            action="PAYMENT_REJECT",
            details=f"Payment request {payment.request_id} rejected by staff {staff_id}. Remarks: {remarks.strip()}.",
            ip_address=ip_address,
            user_agent=user_agent
        )

        self._create_audit_log(
            user_id=staff_id,
            action="PAYMENT_REJECT",
            details=f"Staff {staff_id} rejected payment request {payment.request_id}. Remarks: {remarks.strip()}.",
            ip_address=ip_address,
            user_agent=user_agent
        )

        return payment

    def resubmit_payment(self, original_request_id: int, user_id: int, payment_in: PaymentRequestCreate, file=None) -> PaymentRequest:
        original = self.db.query(PaymentRequest).filter(
            PaymentRequest.id == original_request_id,
            PaymentRequest.user_id == user_id,
            PaymentRequest.status == PaymentStatus.REJECTED.value
        ).first()
        if not original:
            raise ValueError("Original payment request not found or not eligible for resubmission.")

        latest_pending = self.db.query(PaymentRequest).filter(
            PaymentRequest.user_id == user_id,
            PaymentRequest.status == PaymentStatus.PENDING.value
        ).first()
        if latest_pending:
            raise ValueError("You already have a pending payment request. Please wait for it to be processed.")

        self._validate_payment(user_id, payment_in.semester_id, payment_in.amount_paid, payment_in.transaction_id)

        user = self.db.query(User).filter(User.id == user_id).first()
        department_code = "GEN"
        academic_year = None
        if user:
            if user.department_id:
                dept = self.db.query(Department).filter(Department.id == user.department_id).first()
                if dept:
                    department_code = dept.code
            semester = self.db.query(Semester).filter(Semester.id == payment_in.semester_id).first()
            if semester:
                academic_year = semester.academic_year

        request_id = self._generate_request_id(user_id, department_code, payment_in.semester_id)

        payment_dict = {
            "request_id": request_id,
            "user_id": user_id,
            "department_id": user.department_id if user else None,
            "fee_structure_id": None,
            "semester_id": payment_in.semester_id,
            "academic_year": academic_year,
            "amount_paid": payment_in.amount_paid,
            "payment_date": datetime.utcnow(),
            "transaction_id": payment_in.transaction_id,
            "bank_name": payment_in.bank_name,
            "upi_reference": payment_in.upi_reference,
            "status": PaymentStatus.PENDING.value,
            "original_request_id": original_request_id,
            "is_resubmitted": True,
        }

        if file:
            file_extension = file.filename.split(".")[-1].lower()
            if file_extension not in ["jpg", "jpeg", "png", "pdf"]:
                raise ValueError("Only jpg, jpeg, png, and pdf files are allowed.")

            file_content = file.file.read()
            file_size = len(file_content)
            if file_size > 5 * 1024 * 1024:
                raise ValueError("File size must be less than 5MB.")

            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            with open(file_path, "wb") as f:
                f.write(file_content)
            payment_dict["payment_proof"] = file_path

        db_payment = PaymentRequest(**payment_dict)
        self.db.add(db_payment)
        self.db.commit()
        self.db.refresh(db_payment)

        self._create_notification(user_id, "Payment Resubmitted", f"Your payment request {request_id} has been resubmitted and is pending verification.")
        self._create_audit_log(user_id, "PAYMENT_RESUBMIT", f"Payment request {request_id} resubmitted by student {user_id} (original: {original.request_id})")

        return db_payment

    def _create_notification(self, user_id: int, title: str, message: str):
        db_user = self.db.query(User).filter(User.id == user_id).first()
        recipient_type = (db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)) if db_user and db_user.role else "student"
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            recipient_type=recipient_type,
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()

    def _create_audit_log(self, user_id: int, action: str, details: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)
        self.db.commit()
