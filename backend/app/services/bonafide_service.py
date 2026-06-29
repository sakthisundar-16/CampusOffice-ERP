from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import BonafideRequest, Notification, AuditLog, User, Student
from ..schemas import BonafideRequestCreate, BonafideRequestUpdate
from ..core.config import settings
from ..services.pdf_service import PDFService
from datetime import datetime
import os

class BonafideService:
    def __init__(self, db: Session):
        self.db = db

    def create_request(self, request_in: BonafideRequestCreate, user_id: int) -> BonafideRequest:
        request_dict = request_in.dict()
        request_dict["user_id"] = user_id
        db_request = BonafideRequest(**request_dict)
        self.db.add(db_request)
        self.db.commit()
        self.db.refresh(db_request)
        
        self._create_audit_log(user_id, "BONAFIDE_CREATE", f"Bonafide request created with ID {db_request.id}")
        
        return db_request

    def get_requests_by_user(self, user_id: int) -> List[dict]:
        requests = self.db.query(BonafideRequest).filter(BonafideRequest.user_id == user_id).all()
        result = []
        for req in requests:
            user = self.db.query(User).filter(User.id == req.user_id).first()
            
            # Safely handle required_date, created_at, and updated_at in case they are already strings or datetime objects
            req_date = req.required_date.isoformat() if hasattr(req.required_date, 'isoformat') else req.required_date
            c_at = req.created_at.isoformat() if hasattr(req.created_at, 'isoformat') else (str(req.created_at) if req.created_at else None)
            u_at = req.updated_at.isoformat() if hasattr(req.updated_at, 'isoformat') else (str(req.updated_at) if req.updated_at else None)
            
            result.append({
                "id": req.id,
                "user_id": req.user_id,
                "purpose": req.purpose,
                "reason": req.reason,
                "required_date": req_date,
                "additional_notes": req.additional_notes,
                "status": req.status,
                "approved_by": req.approved_by,
                "remarks": req.remarks,
                "certificate_path": req.certificate_path,
                "created_at": c_at,
                "updated_at": u_at,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "student_id": user.student_id,
                    "email": user.email,
                } if user else None,
            })
        return result

    def get_all_requests(self, skip: int = 0, limit: int = 100, department_id: Optional[int] = None) -> List[dict]:
        query = self.db.query(BonafideRequest)
        if department_id is not None:
            query = query.join(User, BonafideRequest.user_id == User.id).filter(User.department_id == department_id)
            
        requests = query.offset(skip).limit(limit).all()
        result = []
        for req in requests:
            user = self.db.query(User).filter(User.id == req.user_id).first()
            
            # Safely handle required_date, created_at, and updated_at in case they are already strings or datetime objects
            req_date = req.required_date.isoformat() if hasattr(req.required_date, 'isoformat') else req.required_date
            c_at = req.created_at.isoformat() if hasattr(req.created_at, 'isoformat') else (str(req.created_at) if req.created_at else None)
            u_at = req.updated_at.isoformat() if hasattr(req.updated_at, 'isoformat') else (str(req.updated_at) if req.updated_at else None)
            
            result.append({
                "id": req.id,
                "user_id": req.user_id,
                "purpose": req.purpose,
                "reason": req.reason,
                "required_date": req_date,
                "additional_notes": req.additional_notes,
                "status": req.status,
                "approved_by": req.approved_by,
                "remarks": req.remarks,
                "certificate_path": req.certificate_path,
                "created_at": c_at,
                "updated_at": u_at,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "student_id": user.student_id,
                    "email": user.email,
                } if user else None,
            })
        return result

    def update_request(self, request_id: int, request_in: BonafideRequestUpdate, staff_id: int) -> Optional[BonafideRequest]:
        request = self.db.query(BonafideRequest).filter(BonafideRequest.id == request_id).first()
        if not request:
            return None
        
        update_data = request_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(request, field, value)
        
        if request.status == "approved" and not request.certificate_path:
            user = self.db.query(User).filter(User.id == request.user_id).first()
            os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)
            cert_path = f"{settings.PDF_STORAGE_PATH}/bonafide_{request.id}.pdf"
            student = self.db.query(Student).filter(Student.user_id == request.user_id).first()
            quota = student.quota if student else "Govt Quota"
            
            PDFService.generate_bonafide_certificate({
                "id": request.id,
                "student_name": user.full_name if user else "N/A",
                "roll_number": user.student_id if user else "N/A",
                "department": user.department.name if user and user.department else "N/A",
                "quota": quota,
                "purpose": request.purpose or "General",
            }, cert_path)
            request.certificate_path = cert_path
        
        self.db.commit()
        self.db.refresh(request)
        
        if request.status in ["approved", "rejected"]:
            self._create_notification(request.user_id, "Bonafide Request Updated", f"Your bonafide request has been {request.status}")
        
        self._create_audit_log(staff_id, "BONAFIDE_UPDATE", f"Bonafide request {request_id} updated to {request.status}")
        
        return request

    def _create_notification(self, user_id: int, title: str, message: str):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            recipient_type="student"
        )
        self.db.add(notification)
        self.db.commit()

    def _create_audit_log(self, user_id: int, action: str, details: str):
        audit_log = AuditLog(user_id=user_id, action=action, details=details)
        self.db.add(audit_log)
        self.db.commit()