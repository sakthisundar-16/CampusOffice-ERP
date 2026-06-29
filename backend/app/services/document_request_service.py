from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import secrets
import string

from ..models import (
    DocumentRequest, DocumentType, CertificateArchive,
    User, Student, Department, Notification, AuditLog
)
from ..schemas import DocumentRequestCreate, DocumentRequestReview, DocumentRequestResponse
from ..core.config import settings
from .pdf_service import PDFService


class DocumentRequestService:
    def __init__(self, db: Session):
        self.db = db

    def create_request(self, request_in: DocumentRequestCreate, user_id: int) -> DocumentRequest:
        document_type = self.db.query(DocumentType).filter(
            DocumentType.id == request_in.document_type_id,
            DocumentType.is_active == True
        ).first()
        if not document_type:
            raise ValueError("Document type not found or inactive")

        student = self.db.query(Student).filter(Student.user_id == user_id).first()
        if not student:
            raise ValueError("Student profile not found")

        if not student.department:
            raise ValueError("Student department not found")

        dept_code = student.department.code.upper()
        year = datetime.utcnow().year

        prefix = f"DOCREQ-{year}-{dept_code}-"
        existing_count = self.db.query(DocumentRequest).filter(
            DocumentRequest.request_number.like(f"{prefix}%")
        ).count()
        sequence = str(existing_count + 1).zfill(6)
        request_number = f"{prefix}{sequence}"

        duplicate = self.db.query(DocumentRequest).filter(
            DocumentRequest.user_id == user_id,
            DocumentRequest.document_type_id == request_in.document_type_id,
            DocumentRequest.status.in_(["pending", "returned"])
        ).first()
        if duplicate:
            raise ValueError(f"You already have an active request ({duplicate.request_number}) for this document type. Status: {duplicate.status}")

        if request_in.attachment:
            attachment_path = self._save_attachment(request_in.attachment, request_number)
        else:
            attachment_path = None

        request_dict = request_in.dict(exclude={"attachment"})
        request_dict["user_id"] = user_id
        request_dict["request_number"] = request_number
        request_dict["attachment_path"] = attachment_path

        db_request = DocumentRequest(**request_dict)
        self.db.add(db_request)
        self.db.commit()
        self.db.refresh(db_request)

        self._create_audit_log(
            user_id, "DOCUMENT_REQUEST_CREATED",
            f"Document request {db_request.request_number} created for type {document_type.name}",
            document_type_id=document_type.id, request_id=db_request.id
        )

        template_data = self._build_template_data(db_request)
        self._create_notification(
            user_id,
            "Document Request Submitted",
            f"Your request {db_request.request_number} for {document_type.name} has been submitted successfully.",
            document_type_id=document_type.id, request_id=db_request.id
        )

        return db_request

    def get_requests_by_user(self, user_id: int, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.db.query(DocumentRequest).filter(DocumentRequest.user_id == user_id)
        if status and status != "all":
            query = query.filter(DocumentRequest.status == status)
        requests = query.order_by(DocumentRequest.created_at.desc()).all()

        result = []
        for req in requests:
            result.append(self._format_request_response(req))
        return result

    def get_all_requests(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        document_type_id: Optional[int] = None,
        department_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(DocumentRequest)

        if status and status != "all":
            query = query.filter(DocumentRequest.status == status)
        if document_type_id:
            query = query.filter(DocumentRequest.document_type_id == document_type_id)
        if department_id:
            query = query.join(User, DocumentRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).filter(Student.department_id == department_id)
        if search:
            query = query.join(User, DocumentRequest.user_id == User.id)
            query = query.outerjoin(Student, Student.user_id == User.id)
            query = query.outerjoin(Department, Student.department_id == Department.id)
            query = query.filter(
                User.full_name.ilike(f"%{search}%") |
                DocumentRequest.request_number.ilike(f"%{search}%") |
                DocumentRequest.certificate_number.ilike(f"%{search}%") |
                DocumentRequest.verification_code.ilike(f"%{search}%")
            )

        requests = query.offset(skip).limit(limit).all()
        return [self._format_request_response(req) for req in requests]

    def get_request_detail(self, request_id: int, current_user_id: int,
                          current_user_role: str) -> Optional[Dict[str, Any]]:
        req = self.db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
        if not req:
            return None

        if current_user_role == "student" and req.user_id != current_user_id:
            raise PermissionError("Not authorized to view this request")

        return self._format_request_detailed(req)

    def review_request(self, request_id: int, review_in: DocumentRequestReview,
                       staff_id: int) -> Optional[DocumentRequest]:
        req = self.db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
        if not req:
            return None

        if req.status != "pending":
            raise ValueError("Request is not in pending status")

        document_type = self.db.query(DocumentType).filter(DocumentType.id == req.document_type_id).first()
        staff_user = self.db.query(User).filter(User.id == staff_id).first()

        req.status = review_in.status
        req.reviewed_by = staff_id
        req.reviewed_at = datetime.utcnow()
        req.review_remarks = review_in.remarks

        self.db.commit()
        self.db.refresh(req)

        action_map = {
            "approved": "DOCUMENT_REQUEST_APPROVED",
            "rejected": "DOCUMENT_REQUEST_REJECTED",
            "returned": "DOCUMENT_REQUEST_RETURNED"
        }
        action = action_map.get(review_in.status, "DOCUMENT_REQUEST_UPDATED")
        self._create_audit_log(
            staff_id, action,
            f"Document request {req.request_number} reviewed: {review_in.status}. Remarks: {review_in.remarks}",
            document_type_id=req.document_type_id, request_id=req.id
        )

        title_map = {
            "approved": f"{document_type.name if document_type else 'Document'} Request Approved",
            "rejected": f"{document_type.name if document_type else 'Document'} Request Rejected",
            "returned": f"{document_type.name if document_type else 'Document'} Request Returned"
        }
        message_map = {
            "approved": f"Your request {req.request_number} for {document_type.name if document_type else 'the document'} has been approved. Your certificate is being generated.",
            "rejected": f"Your request {req.request_number} has been rejected. Remarks: {review_in.remarks}",
            "returned": f"Your request {req.request_number} has been returned for correction. Remarks: {review_in.remarks}"
        }
        self._create_notification(
            req.user_id, title_map[review_in.status], message_map[review_in.status],
            document_type_id=req.document_type_id, request_id=req.id
        )

        return req

    def issue_document(self, request_id: int, staff_id: int) -> Optional[DocumentRequest]:
        req = self.db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
        if not req:
            return None

        if req.status != "approved":
            raise ValueError("Only approved requests can be issued")

        if req.certificate_path:
            return req

        document_type = self.db.query(DocumentType).filter(DocumentType.id == req.document_type_id).first()
        if not document_type:
            raise ValueError("Document type not found")

        os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)

        cert_number = self._generate_certificate_number(document_type)

        verification_code = secrets.token_urlsafe(16)

        req.certificate_number = cert_number
        req.verification_code = verification_code
        req.issued_by = staff_id
        req.issued_at = datetime.utcnow()

        cert_path = f"{settings.PDF_STORAGE_PATH}/{document_type.certificate_prefix.lower()}_{req.id}.pdf"

        student_user = self.db.query(User).filter(User.id == req.user_id).first()
        staff_user = self.db.query(User).filter(User.id == staff_id).first()

        student = self.db.query(Student).filter(Student.user_id == req.user_id).first()
        dept = student.department if student else None

        year = req.created_at.year if req.created_at else datetime.utcnow().year

        valid_until = None
        if document_type.validity_days:
            valid_until = (datetime.utcnow() + __import__('datetime').timedelta(days=document_type.validity_days)).strftime("%Y-%m-%d")

        custom_fields: Dict[str, Any] = {}
        if document_type.template_fields:
            try:
                custom_fields = __import__('json').loads(document_type.template_fields)
            except Exception:
                custom_fields = {}

        allowed_purposes: list = []
        if document_type.allowed_purposes:
            try:
                allowed_purposes = __import__('json').loads(document_type.allowed_purposes)
            except Exception:
                allowed_purposes = []

        pdf_data = {
            "id": req.id,
            "certificate_number": cert_number,
            "verification_code": verification_code,
            "student_name": student_user.full_name if student_user else "N/A",
            "roll_number": student.roll_number if student else "N/A",
            "department": dept.name if dept else "N/A",
            "department_code": dept.code if dept else "N/A",
            "semester": student.current_semester if student else None,
            "quota": student.quota if student else "Govt Quota",
            "purpose": req.purpose or "General",
            "document_title": document_type.certificate_title,
            "issued_by": staff_user.full_name if staff_user else "Office Staff",
            "issue_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "academic_year": f"{year}-{year + 1}",
            "valid_until": valid_until,
            "custom_fields": custom_fields,
            "allowed_purposes": allowed_purposes,
        }

        PDFService.generate_document_certificate(pdf_data, cert_path, document_type.certificate_title)

        req.certificate_path = cert_path
        self.db.commit()
        self.db.refresh(req)

        archive = CertificateArchive(
            certificate_number=cert_number,
            request_id=req.id,
            document_type_id=document_type.id,
            user_id=req.user_id,
            issued_by=staff_id,
            issued_at=req.issued_at,
            file_path=cert_path,
            verification_code=verification_code,
        )
        self.db.add(archive)
        self.db.commit()

        self._create_audit_log(
            staff_id, "CERTIFICATE_ISSUED",
            f"Certificate {cert_number} issued for request {req.request_number}",
            document_type_id=document_type.id, request_id=req.id,
            certificate_number=cert_number
        )

        self._create_notification(
            req.user_id,
            "Document Ready for Download",
            f"Your {document_type.name} (Certificate: {cert_number}) is ready. Please download it from your dashboard.",
            document_type_id=document_type.id, request_id=req.id
        )

        return req

    def mark_downloaded(self, request_id: int, user_id: int) -> Optional[DocumentRequest]:
        req = self.db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
        if not req:
            return None

        if req.user_id != user_id:
            raise PermissionError("Not authorized")

        req.downloaded_at = datetime.utcnow()
        req.is_archived = True
        self.db.commit()
        self.db.refresh(req)

        self._create_audit_log(
            user_id, "CERTIFICATE_DOWNLOADED",
            f"Certificate {req.certificate_number} downloaded for request {req.request_number}",
            request_id=req.id, certificate_number=req.certificate_number
        )

        return req

    def verify_certificate(self, certificate_number: str) -> Optional[Dict[str, Any]]:
        archive = self.db.query(CertificateArchive).filter(
            CertificateArchive.certificate_number == certificate_number
        ).first()
        if not archive:
            return None

        req = self.db.query(DocumentRequest).filter(DocumentRequest.id == archive.request_id).first()
        doc_type = self.db.query(DocumentType).filter(DocumentType.id == archive.document_type_id).first()
        user = self.db.query(User).filter(User.id == archive.user_id).first()

        return {
            "certificate_number": archive.certificate_number,
            "verification_code": archive.verification_code,
            "status": req.status if req else "unknown",
            "is_valid": req and req.status == "approved" and not req.is_archived,
            "issued_at": archive.issued_at.isoformat() if archive.issued_at else None,
            "student_name": user.full_name if user else "N/A",
            "roll_number": user.student_id if user else "N/A",
            "document_type": doc_type.name if doc_type else "Unknown",
            "certificate_title": doc_type.certificate_title if doc_type else "Unknown",
            "issued_by": archive.issued_by,
        }

    def get_work_queue_stats(self) -> Dict[str, int]:
        pending_requests = self.db.query(DocumentRequest).filter(DocumentRequest.status == "pending").count()
        approved_requests = self.db.query(DocumentRequest).filter(DocumentRequest.status == "approved").count()
        returned_requests = self.db.query(DocumentRequest).filter(DocumentRequest.status == "returned").count()
        rejected_requests = self.db.query(DocumentRequest).filter(DocumentRequest.status == "rejected").count()
        total_requests = self.db.query(DocumentRequest).count()
        archived_requests = self.db.query(DocumentRequest).filter(DocumentRequest.is_archived == True).count()

        return {
            "pending_document_requests": pending_requests,
            "approved_document_requests": approved_requests,
            "returned_document_requests": returned_requests,
            "rejected_document_requests": rejected_requests,
            "total_document_requests": total_requests,
            "archived_requests": archived_requests,
        }

    def _generate_certificate_number(self, document_type: DocumentType) -> str:
        prefix = document_type.certificate_prefix
        year = datetime.utcnow().year

        latest = self.db.query(DocumentRequest).filter(
            DocumentRequest.certificate_number.like(f"{prefix}-{year}-%")
        ).order_by(DocumentRequest.certificate_number.desc()).first()

        if latest and latest.certificate_number:
            try:
                last_num = int(latest.certificate_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        sequence = str(next_num).zfill(6)
        return f"{prefix}-{year}-{sequence}"

    def _save_attachment(self, attachment_base64: str, request_number: str) -> str:
        import base64
        import re

        os.makedirs(f"{settings.UPLOAD_DIR}/attachments", exist_ok=True)

        match = re.match(r"data:([^;]+);base64,(.+)", attachment_base64)
        if not match:
            raise ValueError("Invalid attachment format")

        content_type, b64_data = match.groups()
        ext_map = {
            "application/pdf": "pdf",
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/jpg": "jpg",
        }
        ext = ext_map.get(content_type, "pdf")

        filename = f"{settings.UPLOAD_DIR}/attachments/{request_number}_attachment.{ext}"
        with open(filename, "wb") as f:
            f.write(base64.b64decode(b64_data))

        return filename

    def _create_notification(self, user_id: int, title: str, message: str,
                            document_type_id: Optional[int] = None,
                            request_id: Optional[int] = None):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            recipient_type="student",
            is_read=False,
        )
        self.db.add(notification)
        self.db.commit()

    def _create_audit_log(self, user_id: Optional[int], action: str, details: str,
                          ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                          document_type_id: Optional[int] = None,
                          request_id: Optional[int] = None,
                          certificate_number: Optional[str] = None):
        extra = {
            "document_type_id": document_type_id,
            "request_id": request_id,
            "certificate_number": certificate_number,
        }
        log = AuditLog(
            user_id=user_id,
            action=action,
            details=f"{details} | {extra}",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        self.db.commit()

    def _build_template_data(self, req: DocumentRequest) -> Dict[str, Any]:
        return {
            "id": req.id,
            "request_number": req.request_number,
            "purpose": req.purpose,
            "reason": req.reason,
            "required_date": req.required_date.strftime("%Y-%m-%d") if req.required_date else None,
            "created_at": req.created_at.strftime("%Y-%m-%d %H:%M") if req.created_at else None,
        }

    def _format_request_response(self, req: DocumentRequest) -> Dict[str, Any]:
        user = self.db.query(User).filter(User.id == req.user_id).first()
        doc_type = self.db.query(DocumentType).filter(DocumentType.id == req.document_type_id).first()
        student = self.db.query(Student).filter(Student.user_id == req.user_id).first()
        reviewer = self.db.query(User).filter(User.id == req.reviewed_by).first() if req.reviewed_by else None
        issuer = self.db.query(User).filter(User.id == req.issued_by).first() if req.issued_by else None

        dept = student.department if student else None

        return {
            "id": req.id,
            "request_number": req.request_number,
            "user_id": req.user_id,
            "document_type_id": req.document_type_id,
            "document_type": {
                "id": doc_type.id,
                "code": doc_type.code,
                "name": doc_type.name,
                "description": doc_type.description,
                "certificate_prefix": doc_type.certificate_prefix,
                "certificate_title": doc_type.certificate_title,
                "is_active": doc_type.is_active,
            } if doc_type else None,
            "purpose": req.purpose,
            "reason": req.reason,
            "required_date": req.required_date.isoformat() if req.required_date else None,
            "additional_notes": req.additional_notes,
            "attachment_path": req.attachment_path,
            "status": req.status,
            "reviewed_by": req.reviewed_by,
            "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
            "review_remarks": req.review_remarks,
            "certificate_path": req.certificate_path,
            "certificate_number": req.certificate_number,
            "verification_code": req.verification_code,
            "issued_at": req.issued_at.isoformat() if req.issued_at else None,
            "issued_by": req.issued_by,
            "downloaded_at": req.downloaded_at.isoformat() if req.downloaded_at else None,
            "is_archived": req.is_archived,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None,
            "requester_name": user.full_name if user else "N/A",
            "requester_email": user.email if user else "N/A",
            "roll_number": student.roll_number if student else "N/A",
            "department": dept.name if dept else "N/A",
            "department_code": dept.code if dept else "N/A",
            "semester": student.current_semester if student else None,
            "reviewer_name": reviewer.full_name if reviewer else None,
            "issuer_name": issuer.full_name if issuer else None,
        }

    def _format_request_detailed(self, req: DocumentRequest) -> Dict[str, Any]:
        response = self._format_request_response(req)
        doc_type = self.db.query(DocumentType).filter(DocumentType.id == req.document_type_id).first()

        history_events = []
        history_events.append({
            "event": "Request Submitted",
            "timestamp": req.created_at.isoformat() if req.created_at else None,
            "notes": f"Submitted for {doc_type.name if doc_type else 'document'}",
        })
        if req.reviewed_at:
            history_events.append({
                "event": f"Request {req.status.title()}",
                "timestamp": req.reviewed_at.isoformat(),
                "notes": req.review_remarks or "",
                "reviewed_by": response.get("reviewer_name"),
            })
        if req.issued_at:
            history_events.append({
                "event": "Certificate Issued",
                "timestamp": req.issued_at.isoformat(),
                "notes": f"Certificate {req.certificate_number} issued",
                "issued_by": response.get("issuer_name"),
            })
        if req.downloaded_at:
            history_events.append({
                "event": "Certificate Downloaded",
                "timestamp": req.downloaded_at.isoformat(),
            })

        response["history"] = history_events
        return response
