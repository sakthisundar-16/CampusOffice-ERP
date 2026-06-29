from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
from ...database import SessionLocal
from ...models import User, DocumentRequest, DocumentType, Student, Department
from ...schemas import DocumentRequestReview
from ...services.document_request_service import DocumentRequestService
from ...services.workflow_automation_service import WorkflowAutomationService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_staff, verify_document_ownership

router = APIRouter(prefix="/api/v1/staff/documents", tags=["staff-documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/work-queue")
async def get_document_work_queue(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    doc_service = DocumentRequestService(db)
    stats = doc_service.get_work_queue_stats()

    existing_stats = None
    main_staff_router = None
    try:
        from .. import staff as staff_module
        existing_stats_fn = getattr(staff_module, '_get_work_queue_stats', None)
        if existing_stats_fn:
            existing_stats = existing_stats_fn(db)
    except Exception:
        pass

    return {
        **stats,
        "pending_payments": existing_stats.get("pending_payments", 0) if existing_stats else 0,
        "pending_results": existing_stats.get("pending_results", 0) if existing_stats else 0,
        "completed_today": existing_stats.get("completed_today", 0) if existing_stats else 0,
        "rejected_today": existing_stats.get("rejected_today", 0) if existing_stats else 0,
    }

@router.get("/requests")
async def get_all_document_requests(
    status: Optional[str] = None,
    document_type_id: Optional[int] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    doc_service = DocumentRequestService(db)
    try:
        if current_user.role == "staff" and current_user.department_id:
            department_id = current_user.department_id

        requests = doc_service.get_all_requests(
            skip=skip, limit=limit,
            status=status,
            document_type_id=document_type_id,
            department_id=department_id,
            search=search,
        )
        total = doc_service.db.query(DocumentRequest).count()
        return {"requests": requests, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/request-types")
async def get_document_types(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    doc_types = db.query(DocumentType).order_by(DocumentType.name).all()
    return {
        "document_types": [
            {
                "id": dt.id,
                "code": dt.code,
                "name": dt.name,
                "description": dt.description,
                "is_active": dt.is_active,
                "certificate_prefix": dt.certificate_prefix,
                "certificate_title": dt.certificate_title,
            }
            for dt in doc_types
        ]
    }

@router.put("/requests/{request_id}/review")
async def review_document_request(
    request_id: int,
    review_in: DocumentRequestReview,
    request: Request,
    doc_request: DocumentRequest = Depends(verify_document_ownership),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    workflow_service = WorkflowAutomationService(db)

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        if review_in.status == "rejected" and not review_in.remarks.strip():
            raise HTTPException(status_code=400, detail="Remarks are required for rejection")

        if review_in.status == "approved":
            result = workflow_service.execute_document_approved_workflow(
                document_request_id=request_id,
                approved_by=current_user.id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            # Send WebSocket notification
            from ...core.websocket import websocket_manager
            await websocket_manager.send_notification_to_user(doc_request.user_id, {
                "type": "REQUEST_UPDATED",
                "category": "document",
                "title": "Document Request Approved",
                "message": "Your document request has been approved.",
                "request_id": request_id,
                "status": "approved"
            })
            return {
                "id": request_id,
                "certificate_number": result.get('certificate_number'),
                "file_path": result.get('file_path'),
                "message": "Document approved successfully"
            }
        elif review_in.status == "rejected":
            result = workflow_service.execute_document_rejected_workflow(
                document_request_id=request_id,
                rejected_by=current_user.id,
                remarks=review_in.remarks,
                ip_address=ip_address,
                user_agent=user_agent
            )
            # Send WebSocket notification
            from ...core.websocket import websocket_manager
            await websocket_manager.send_notification_to_user(doc_request.user_id, {
                "type": "REQUEST_UPDATED",
                "category": "document",
                "title": "Document Request Rejected",
                "message": f"Your document request has been rejected. Reason: {review_in.remarks}",
                "request_id": request_id,
                "status": "rejected"
            })
            return {
                "id": request_id,
                "message": "Document rejected successfully"
            }
        else:
            # For "returned" status, use the original service
            service = DocumentRequestService(db)
            result = service.review_request(request_id, review_in, current_user.id)
            if not result:
                raise HTTPException(status_code=404, detail="Document request not found")
            
            # Send WebSocket notification
            from ...core.websocket import websocket_manager
            await websocket_manager.send_notification_to_user(doc_request.user_id, {
                "type": "REQUEST_UPDATED",
                "category": "document",
                "title": f"Document Request {review_in.status.upper()}",
                "message": f"Your document request has been {review_in.status}.",
                "request_id": request_id,
                "status": review_in.status
            })
            
            response = service._format_request_detailed(result)
            response["message"] = f"Request {review_in.status} successfully"
            return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error reviewing request: {str(e)}")

@router.post("/requests/{request_id}/issue")
async def issue_document(
    request_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    service = DocumentRequestService(db)
    try:
        result = service.issue_document(request_id, current_user.id)
        if not result:
            raise HTTPException(status_code=404, detail="Document request not found")
        
        # Send WebSocket notification to the student
        from ...core.websocket import websocket_manager
        await websocket_manager.send_notification_to_user(result.user_id, {
            "type": "REQUEST_UPDATED",
            "category": "document",
            "title": "Document Certificate Issued",
            "message": f"Your requested document ({result.document_type.name if result.document_type else 'Document'}) has been issued.",
            "request_id": request_id,
            "status": "completed"
        })

        response = service._format_request_detailed(result)
        response["message"] = "Certificate issued successfully"
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error issuing document: {str(e)}")

@router.get("/requests/{request_id}/preview")
async def preview_document(
    request_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    req = db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if not req.certificate_path or not os.path.exists(req.certificate_path):
        raise HTTPException(status_code=404, detail="Certificate not generated yet")

    filename = f"{req.certificate_number or 'document'}.pdf"
    return FileResponse(req.certificate_path, filename=filename, media_type="application/pdf")
