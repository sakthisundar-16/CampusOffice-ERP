from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, Dict, Any
from datetime import datetime
import json
import asyncio

from ..models import (
    PaymentRequest, BonafideRequest, DocumentRequest, Result,
    Notification, AuditLog, User, Student, UnifiedRequest,
    RequestType, RequestStatus
)
from ..services.request_engine_service import RequestEngineService
from ..services.notification_service import NotificationService
from ..services.payment_service import PaymentService
from ..services.document_request_service import DocumentRequestService
from ..services.document_metadata_service import DocumentMetadataService
from ..core.redis_client import invalidate_dashboard_cache


class WorkflowAutomationService:
    def __init__(self, db: Session):
        self.db = db
        self.request_engine = RequestEngineService(db)
        self.notification_service = NotificationService(db)
        self.payment_service = PaymentService(db)
        self.document_service = DocumentRequestService(db)
        self.document_metadata_service = DocumentMetadataService(db)

    def execute_payment_approved_workflow(
        self,
        payment_id: int,
        approved_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Workflow: Payment Approved
        1. Update Fee Ledger (handled by PaymentService)
        2. Generate Receipt (handled by PaymentService)
        3. Create Notification
        4. Update Dashboard (via Request Engine)
        5. Write Audit Log
        6. Invalidate Cache
        """
        payment = self.db.query(PaymentRequest).options(
            joinedload(PaymentRequest.user)
        ).filter(PaymentRequest.id == payment_id).first()
        if not payment:
            raise ValueError("Payment request not found")

        user = payment.user
        if not user:
            raise ValueError("User not found")

        # Step 1 & 2: Update Fee Ledger and Generate Receipt (via PaymentService)
        receipt_result = self.payment_service.approve_payment_request(
            payment_id=payment_id,
            staff_id=approved_by,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Step 3: Create Notification
        self.notification_service.create_notification(
            user_id=payment.user_id,
            title="Payment Approved",
            message=f"Your payment of Rs. {payment.amount_paid} has been approved. Receipt: {getattr(receipt_result, 'receipt_number', 'N/A')}",
            category="payment",
            recipient_type="student"
        )

        # Step 4: Update Dashboard via Request Engine
        unified_request = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.reference_id == payment_id,
            UnifiedRequest.reference_type == "payment_request"
        ).first()
        
        if unified_request:
            self.request_engine.update_request_status(
                request_id=unified_request.id,
                new_status=RequestStatus.COMPLETED.value,
                stage="approved",
                description="Payment approved and receipt generated",
                actor_id=approved_by,
                actor_role="staff",
                ip_address=ip_address
            )

        # Step 5: Write Audit Log
        audit_log = AuditLog(
            user_id=approved_by,
            action="PAYMENT_APPROVED",
            details=f"Payment {payment.request_id} approved for user {payment.user_id}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)

        # Log activity
        self.request_engine.log_activity(
            user_id=approved_by,
            activity_type="PAYMENT_APPROVED",
            entity_type="payment_request",
            entity_id=payment_id,
            description=f"Payment {payment.request_id} approved",
            old_value="pending",
            new_value="completed",
            reference_number=payment.request_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.commit()

        # Step 6: Invalidate cache for the affected user (run in background)
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(invalidate_dashboard_cache(payment.user_id, "student"))
        except RuntimeError:
            pass

        return {
            "success": True,
            "payment_id": payment_id,
            "receipt_number": getattr(receipt_result, 'receipt_number', None),
            "receipt_path": getattr(receipt_result, 'receipt_path', None),
            "workflow_steps": ["fee_ledger_updated", "receipt_generated", "notification_created", "dashboard_updated", "audit_logged", "cache_invalidated"]
        }

    def execute_document_approved_workflow(
        self,
        document_request_id: int,
        approved_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Workflow: Document Approved
        1. Generate PDF (handled by DocumentRequestService)
        2. Generate QR (handled by DocumentMetadataService)
        3. Store PDF (handled by DocumentRequestService)
        4. Create Notification
        5. Dashboard Updates (via Request Engine)
        6. Audit Log
        7. Invalidate Cache
        """
        doc_request = self.db.query(DocumentRequest).options(
            joinedload(DocumentRequest.requester)
        ).filter(DocumentRequest.id == document_request_id).first()
        if not doc_request:
            raise ValueError("Document request not found")

        user = doc_request.requester
        if not user:
            raise ValueError("User not found")

        # Step 1 & 3: Generate and Store PDF (via DocumentRequestService)
        pdf_result = self.document_service.approve_document_request(
            request_id=document_request_id,
            reviewed_by=approved_by,
            review_remarks="Document approved via workflow automation"
        )

        # Step 2: Generate QR and Document Metadata
        if pdf_result.get('certificate_number') and pdf_result.get('file_path'):
            doc_metadata = self.document_metadata_service.create_document_metadata(
                document_request_id=document_request_id,
                certificate_prefix="DOC",
                file_path=pdf_result['file_path'],
                generated_by=approved_by,
                metadata={
                    "document_type_id": doc_request.document_type_id,
                    "purpose": doc_request.purpose
                }
            )

        # Step 4: Create Notification
        self.notification_service.create_notification(
            user_id=doc_request.user_id,
            title="Document Approved",
            message=f"Your document request {doc_request.request_number} has been approved. Certificate: {pdf_result.get('certificate_number', 'N/A')}",
            category="document",
            recipient_type="student"
        )

        # Step 5: Dashboard Updates via Request Engine
        unified_request = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.reference_id == document_request_id,
            UnifiedRequest.reference_type == "document_request"
        ).first()
        
        if unified_request:
            self.request_engine.update_request_status(
                request_id=unified_request.id,
                new_status=RequestStatus.COMPLETED.value,
                stage="generated",
                description="Document approved, PDF generated and stored",
                actor_id=approved_by,
                actor_role="staff",
                ip_address=ip_address
            )

        # Step 6: Write Audit Log
        audit_log = AuditLog(
            user_id=approved_by,
            action="DOCUMENT_APPROVED",
            details=f"Document request {doc_request.request_number} approved for user {doc_request.user_id}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)

        # Log activity
        self.request_engine.log_activity(
            user_id=approved_by,
            activity_type="DOCUMENT_APPROVED",
            entity_type="document_request",
            entity_id=document_request_id,
            description=f"Document {doc_request.request_number} approved and generated",
            old_value="pending",
            new_value="approved",
            reference_number=doc_request.request_number,
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.commit()

        # Step 7: Invalidate cache for the affected user (run in background)
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(invalidate_dashboard_cache(doc_request.user_id, "student"))
        except RuntimeError:
            pass

        return {
            "success": True,
            "document_request_id": document_request_id,
            "certificate_number": pdf_result.get('certificate_number'),
            "file_path": pdf_result.get('file_path'),
            "workflow_steps": ["pdf_generated", "qr_generated", "pdf_stored", "notification_created", "dashboard_updated", "audit_logged", "cache_invalidated"]
        }

    def execute_results_published_workflow(
        self,
        result_id: int,
        published_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Workflow: Results Published
        1. Student Notification
        2. Dashboard Update (via Request Engine)
        3. Academic Record Update
        """
        result = self.db.query(Result).options(
            joinedload(Result.user).joinedload(User.student_profile)
        ).filter(Result.id == result_id).first()
        if not result:
            raise ValueError("Result not found")

        user = result.user
        if not user:
            raise ValueError("User not found")

        student = user.student_profile
        if not student:
            raise ValueError("Student profile not found")

        # Step 1: Create Notification
        self.notification_service.create_notification(
            user_id=result.user_id,
            title="Results Published",
            message=f"Your results for Semester {result.semester} have been published. GPA: {result.gpa}",
            category="academic",
            recipient_type="student"
        )

        # Step 2: Dashboard Update via Request Engine
        unified_request = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.reference_id == result_id,
            or_(
                UnifiedRequest.reference_type == "result",
                UnifiedRequest.reference_type == "result_publication"
            )
        ).first()
        
        if unified_request:
            self.request_engine.update_request_status(
                request_id=unified_request.id,
                new_status=RequestStatus.COMPLETED.value,
                stage="published",
                description=f"Results for Semester {result.semester} published",
                actor_id=published_by,
                actor_role="staff",
                ip_address=ip_address
            )

        # Step 3: Academic Record Update
        student.gpa = str(result.gpa)
        self.db.commit()

        # Write Audit Log
        audit_log = AuditLog(
            user_id=published_by,
            action="RESULTS_PUBLISHED",
            details=f"Results published for user {result.user_id}, Semester {result.semester}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)

        # Log activity
        self.request_engine.log_activity(
            user_id=published_by,
            activity_type="RESULTS_PUBLISHED",
            entity_type="result",
            entity_id=result_id,
            description=f"Results for Semester {result.semester} published with GPA {result.gpa}",
            old_value=None,
            new_value=str(result.gpa),
            reference_number=f"RESULT-{result.id}",
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.commit()

        return {
            "success": True,
            "result_id": result_id,
            "semester": result.semester,
            "gpa": result.gpa,
            "workflow_steps": ["notification_created", "dashboard_updated", "academic_record_updated"]
        }

    def execute_payment_rejected_workflow(
        self,
        payment_id: int,
        rejected_by: int,
        remarks: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Workflow: Payment Rejected
        1. Update Payment Status
        2. Create Notification
        3. Dashboard Update (via Request Engine)
        4. Write Audit Log
        5. Invalidate Cache
        """
        payment = self.db.query(PaymentRequest).options(
            joinedload(PaymentRequest.user)
        ).filter(PaymentRequest.id == payment_id).first()
        if not payment:
            raise ValueError("Payment request not found")

        # Step 1: Update Payment Status
        payment.status = "rejected"
        payment.remarks = remarks
        payment.verified_by = rejected_by
        payment.verified_at = datetime.utcnow()

        # Step 2: Create Notification
        self.notification_service.create_notification(
            user_id=payment.user_id,
            title="Payment Rejected",
            message=f"Your payment request {payment.request_id} has been rejected. Reason: {remarks}",
            category="payment",
            recipient_type="student"
        )

        # Step 3: Dashboard Update via Request Engine
        unified_request = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.reference_id == payment_id,
            UnifiedRequest.reference_type == "payment_request"
        ).first()
        
        if unified_request:
            self.request_engine.update_request_status(
                request_id=unified_request.id,
                new_status=RequestStatus.REJECTED.value,
                stage="rejected",
                description=f"Payment rejected: {remarks}",
                actor_id=rejected_by,
                actor_role="staff",
                ip_address=ip_address
            )

        # Step 4: Write Audit Log
        audit_log = AuditLog(
            user_id=rejected_by,
            action="PAYMENT_REJECTED",
            details=f"Payment {payment.request_id} rejected for user {payment.user_id}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)

        # Log activity
        self.request_engine.log_activity(
            user_id=rejected_by,
            activity_type="PAYMENT_REJECTED",
            entity_type="payment_request",
            entity_id=payment_id,
            description=f"Payment {payment.request_id} rejected: {remarks}",
            old_value="pending",
            new_value="rejected",
            reference_number=payment.request_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.commit()

        # Step 5: Invalidate cache for the affected user (run in background)
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(invalidate_dashboard_cache(payment.user_id, "student"))
        except RuntimeError:
            pass

        return {
            "success": True,
            "payment_id": payment_id,
            "workflow_steps": ["status_updated", "notification_created", "dashboard_updated", "audit_logged", "cache_invalidated"]
        }

    def execute_document_rejected_workflow(
        self,
        document_request_id: int,
        rejected_by: int,
        remarks: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Workflow: Document Rejected
        1. Update Document Status
        2. Create Notification
        3. Dashboard Update (via Request Engine)
        4. Write Audit Log
        5. Invalidate Cache
        """
        doc_request = self.db.query(DocumentRequest).options(
            joinedload(DocumentRequest.requester)
        ).filter(DocumentRequest.id == document_request_id).first()
        if not doc_request:
            raise ValueError("Document request not found")

        # Step 1: Update Document Status
        doc_request.status = "rejected"
        doc_request.review_remarks = remarks
        doc_request.reviewed_by = rejected_by
        doc_request.reviewed_at = datetime.utcnow()

        # Step 2: Create Notification
        self.notification_service.create_notification(
            user_id=doc_request.user_id,
            title="Document Request Rejected",
            message=f"Your document request {doc_request.request_number} has been rejected. Reason: {remarks}",
            category="document",
            recipient_type="student"
        )

        # Step 3: Dashboard Update via Request Engine
        unified_request = self.db.query(UnifiedRequest).filter(
            UnifiedRequest.reference_id == document_request_id,
            UnifiedRequest.reference_type == "document_request"
        ).first()
        
        if unified_request:
            self.request_engine.update_request_status(
                request_id=unified_request.id,
                new_status=RequestStatus.REJECTED.value,
                stage="rejected",
                description=f"Document request rejected: {remarks}",
                actor_id=rejected_by,
                actor_role="staff",
                ip_address=ip_address
            )

        # Step 4: Write Audit Log
        audit_log = AuditLog(
            user_id=rejected_by,
            action="DOCUMENT_REJECTED",
            details=f"Document request {doc_request.request_number} rejected for user {doc_request.user_id}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)

        # Log activity
        self.request_engine.log_activity(
            user_id=rejected_by,
            activity_type="DOCUMENT_REJECTED",
            entity_type="document_request",
            entity_id=document_request_id,
            description=f"Document {doc_request.request_number} rejected: {remarks}",
            old_value="pending",
            new_value="rejected",
            reference_number=doc_request.request_number,
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.commit()

        # Step 5: Invalidate cache for the affected user (run in background)
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(invalidate_dashboard_cache(doc_request.user_id, "student"))
        except RuntimeError:
            pass

        return {
            "success": True,
            "document_request_id": document_request_id,
            "workflow_steps": ["status_updated", "notification_created", "dashboard_updated", "audit_logged", "cache_invalidated"]
        }
