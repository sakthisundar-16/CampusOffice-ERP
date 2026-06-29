from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import re

from ..models import (
    UnifiedRequest, RequestTimeline, ActivityHistory, DocumentMetadata,
    User, Department, Semester, PaymentRequest, BonafideRequest, Result,
    RequestType, RequestStatus
)
from ..schemas import NotificationResponse


class RequestEngineService:
    def __init__(self, db: Session):
        self.db = db

    def _generate_request_number(self, request_type: str, user_id: int) -> str:
        user = self.db.query(User).options(
            joinedload(User.department)
        ).filter(User.id == user_id).first()
        dept_code = "GEN"
        if user and user.department_id:
            dept = user.department
            if dept:
                dept_code = re.sub(r'[^A-Z0-9]', '', dept.code.upper())[:3]
        
        year = datetime.utcnow().year
        type_prefix = {
            RequestType.PAYMENT.value: "PAY",
            RequestType.DOCUMENT.value: "DOC",
            RequestType.RESULT.value: "RES",
            RequestType.PROFILE_UPDATE.value: "PRF",
            RequestType.CERTIFICATE.value: "CRT"
        }.get(request_type, "REQ")
        
        prefix = f"{type_prefix}-{year}-{dept_code}-"
        
        latest = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.request_number.like(f"{prefix}%")
        ).order_by(UnifiedRequest.id.desc()).first()
        
        if latest:
            last_num = int(latest.request_number.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:06d}"

    def create_unified_request(
        self,
        request_type: str,
        user_id: int,
        reference_id: Optional[int],
        reference_type: Optional[str],
        department_id: Optional[int],
        semester_id: Optional[int],
        academic_year: Optional[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> UnifiedRequest:
        request_number = self._generate_request_number(request_type, user_id)
        
        unified_request = UnifiedRequest(
            request_number=request_number,
            request_type=request_type,
            user_id=user_id,
            status=RequestStatus.SUBMITTED.value,
            reference_id=reference_id,
            reference_type=reference_type,
            department_id=department_id,
            semester_id=semester_id,
            academic_year=academic_year,
            request_metadata=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(unified_request)
        self.db.commit()
        self.db.refresh(unified_request)
        
        # Add initial timeline entry
        self.add_timeline_entry(
            request_id=unified_request.id,
            status=RequestStatus.SUBMITTED.value,
            stage="submitted",
            description="Request submitted successfully",
            actor_id=user_id,
            actor_role="student"
        )
        
        # Log activity
        self.log_activity(
            user_id=user_id,
            activity_type=f"{request_type.upper()}_REQUEST_CREATED",
            entity_type="unified_request",
            entity_id=unified_request.id,
            description=f"{request_type.title()} request {request_number} submitted",
            reference_number=request_number
        )
        
        return unified_request

    def update_request_status(
        self,
        request_id: int,
        new_status: str,
        stage: str,
        description: str,
        actor_id: int,
        actor_role: str,
        ip_address: Optional[str] = None,
        remarks: Optional[str] = None
    ) -> UnifiedRequest:
        request = self.db.query(UnifiedRequest).filter(UnifiedRequest.id == request_id).first()
        if not request:
            raise ValueError("Request not found")
        
        old_status = request.status
        request.status = new_status
        request.processed_by = actor_id
        request.remarks = remarks
        
        if new_status in [RequestStatus.COMPLETED.value, RequestStatus.REJECTED.value]:
            request.completed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(request)
        
        # Add timeline entry
        self.add_timeline_entry(
            request_id=request.id,
            status=new_status,
            stage=stage,
            description=description,
            actor_id=actor_id,
            actor_role=actor_role,
            ip_address=ip_address
        )
        
        # Log activity
        self.log_activity(
            user_id=actor_id,
            activity_type=f"{request.request_type.upper()}_STATUS_UPDATE",
            entity_type="unified_request",
            entity_id=request.id,
            description=f"Request {request.request_number} status changed from {old_status} to {new_status}",
            old_value=old_status,
            new_value=new_status,
            reference_number=request.request_number,
            ip_address=ip_address
        )
        
        return request

    def add_timeline_entry(
        self,
        request_id: int,
        status: str,
        stage: str,
        description: str,
        actor_id: Optional[int] = None,
        actor_role: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> RequestTimeline:
        timeline = RequestTimeline(
            request_id=request_id,
            status=status,
            stage=stage,
            description=description,
            actor_id=actor_id,
            actor_role=actor_role,
            ip_address=ip_address
        )
        self.db.add(timeline)
        self.db.commit()
        self.db.refresh(timeline)
        return timeline

    def get_request_timeline(self, request_id: int) -> List[Dict[str, Any]]:
        timeline_entries = self.db.query(RequestTimeline).options(
            joinedload(RequestTimeline.actor)
        ).filter(
            RequestTimeline.request_id == request_id
        ).order_by(RequestTimeline.created_at.asc()).all()
        
        result = []
        for entry in timeline_entries:
            result.append({
                "id": entry.id,
                "status": entry.status,
                "stage": entry.stage,
                "description": entry.description,
                "actor_name": entry.actor.full_name if entry.actor else None,
                "actor_role": entry.actor_role,
                "created_at": entry.created_at.isoformat() if entry.created_at else None
            })
        return result

    def log_activity(
        self,
        user_id: int,
        activity_type: str,
        description: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        reference_number: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> ActivityHistory:
        activity = ActivityHistory(
            user_id=user_id,
            activity_type=activity_type,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            old_value=old_value,
            new_value=new_value,
            reference_number=reference_number,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def get_user_activity_history(
        self,
        user_id: int,
        limit: int = 50,
        activity_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = self.db.query(ActivityHistory).filter(ActivityHistory.user_id == user_id)
        if activity_type:
            query = query.filter(ActivityHistory.activity_type == activity_type)
        
        activities = query.order_by(ActivityHistory.created_at.desc()).limit(limit).all()
        
        result = []
        for activity in activities:
            result.append({
                "id": activity.id,
                "activity_type": activity.activity_type,
                "entity_type": activity.entity_type,
                "entity_id": activity.entity_id,
                "description": activity.description,
                "old_value": activity.old_value,
                "new_value": activity.new_value,
                "reference_number": activity.reference_number,
                "created_at": activity.created_at.isoformat() if activity.created_at else None
            })
        return result

    def get_requests_by_user(
        self,
        user_id: int,
        request_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = self.db.query(UnifiedRequest).filter(UnifiedRequest.user_id == user_id)
        
        if request_type:
            query = query.filter(UnifiedRequest.request_type == request_type)
        if status:
            query = query.filter(UnifiedRequest.status == status)
        
        requests = query.order_by(UnifiedRequest.submitted_at.desc()).limit(limit).all()
        
        return [self._format_unified_request(req) for req in requests]

    def get_all_requests(
        self,
        request_type: Optional[str] = None,
        status: Optional[str] = None,
        department_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = self.db.query(UnifiedRequest)
        
        if request_type:
            query = query.filter(UnifiedRequest.request_type == request_type)
        if status:
            query = query.filter(UnifiedRequest.status == status)
        if department_id:
            query = query.filter(UnifiedRequest.department_id == department_id)
        
        requests = query.order_by(UnifiedRequest.submitted_at.desc()).offset(skip).limit(limit).all()
        
        return [self._format_unified_request(req) for req in requests]

    def get_request_detail(self, request_id: int) -> Optional[Dict[str, Any]]:
        request = self.db.query(UnifiedRequest).options(
            joinedload(UnifiedRequest.user),
            joinedload(UnifiedRequest.processor),
            joinedload(UnifiedRequest.department),
            joinedload(UnifiedRequest.semester)
        ).filter(UnifiedRequest.id == request_id).first()
        if not request:
            return None
        
        result = self._format_unified_request(request)
        result["timeline"] = self.get_request_timeline(request_id)
        return result

    def _format_unified_request(self, request: UnifiedRequest) -> Dict[str, Any]:
        user = request.user
        processor = request.processor if request.processed_by else None
        department = request.department if request.department_id else None
        semester = request.semester if request.semester_id else None
        
        return {
            "id": request.id,
            "request_number": request.request_number,
            "request_type": request.request_type,
            "user_id": request.user_id,
            "user_name": user.full_name if user else "N/A",
            "user_email": user.email if user else "N/A",
            "status": request.status,
            "priority": request.priority,
            "reference_id": request.reference_id,
            "reference_type": request.reference_type,
            "department_id": request.department_id,
            "department_name": department.name if department else "N/A",
            "semester_id": request.semester_id,
            "semester_name": semester.name if semester else "N/A",
            "academic_year": request.academic_year,
            "submitted_at": request.submitted_at.isoformat() if request.submitted_at else None,
            "updated_at": request.updated_at.isoformat() if request.updated_at else None,
            "completed_at": request.completed_at.isoformat() if request.completed_at else None,
            "processed_by": request.processed_by,
            "processor_name": processor.full_name if processor else None,
            "remarks": request.remarks,
            "metadata": json.loads(request.request_metadata) if request.request_metadata else None
        }

    def get_work_queue_stats(self) -> Dict[str, int]:
        pending_payments = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.request_type == RequestType.PAYMENT.value,
            UnifiedRequest.status == RequestStatus.SUBMITTED.value
        ).count()
        
        pending_documents = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.request_type == RequestType.DOCUMENT.value,
            UnifiedRequest.status.in_([RequestStatus.SUBMITTED.value, RequestStatus.UNDER_REVIEW.value])
        ).count()
        
        pending_results = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.request_type == RequestType.RESULT.value,
            UnifiedRequest.status == RequestStatus.SUBMITTED.value
        ).count()
        
        processing = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.status == RequestStatus.PROCESSING.value
        ).count()
        
        completed_today = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.status == RequestStatus.COMPLETED.value,
            UnifiedRequest.completed_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        rejected_today = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.status == RequestStatus.REJECTED.value,
            UnifiedRequest.completed_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        return {
            "pending_payments": pending_payments,
            "pending_documents": pending_documents,
            "pending_results": pending_results,
            "processing": processing,
            "completed_today": completed_today,
            "rejected_today": rejected_today
        }
