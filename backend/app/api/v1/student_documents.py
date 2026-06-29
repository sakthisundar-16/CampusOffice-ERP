from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
from datetime import datetime
from ...database import SessionLocal
from ...models import User, Student, DocumentRequest, DocumentType, Notification
from ...schemas import DocumentRequestCreate, DocumentRequestResponse
from ...services.document_request_service import DocumentRequestService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_student

router = APIRouter(prefix="/api/v1/student/documents", tags=["student-documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/types")
async def get_active_document_types(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    doc_types = db.query(DocumentType).filter(DocumentType.is_active == True).all()
    result = []
    for dt in doc_types:
        allowed_purposes = []
        if dt.allowed_purposes:
            import json
            try:
                allowed_purposes = json.loads(dt.allowed_purposes)
            except Exception:
                pass
        result.append({
            "id": dt.id,
            "code": dt.code,
            "name": dt.name,
            "description": dt.description,
            "certificate_title": dt.certificate_title,
            "requires_approval": dt.requires_approval,
            "validity_days": dt.validity_days,
            "allowed_purposes": allowed_purposes,
        })
    return {"document_types": result}

@router.post("/request", response_model=DocumentRequestResponse)
async def create_document_request(
    request_in: DocumentRequestCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    request_dict = request_in.dict()
    service_request = DocumentRequestCreate(**request_dict)
    doc_service = DocumentRequestService(db)
    try:
        req = doc_service.create_request(service_request, current_user.id)
        
        # Save persistent notification in database for staff and admin
        from ...services.notification_service import NotificationService
        ns = NotificationService(db)
        ns.notify_staff_and_admin(
            title="New Document Request",
            message=f"Student {current_user.full_name} submitted a new document request.",
            category="document"
        )

        # Send WebSocket notification to staff and admin
        from ...core.websocket import websocket_manager
        await websocket_manager.broadcast_to_role("staff", {
            "type": "NEW_REQUEST",
            "category": "document",
            "title": "New Document Request",
            "message": f"Student {current_user.full_name} submitted a new document request.",
            "student_id": current_user.student_id
        })
        await websocket_manager.broadcast_to_role("admin", {
            "type": "NEW_REQUEST",
            "category": "document",
            "title": "New Document Request",
            "message": f"Student {current_user.full_name} submitted a new document request.",
            "student_id": current_user.student_id
        })

        return doc_service._format_request_detailed(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating document request: {str(e)}")

@router.get("/requests")
async def get_my_document_requests(
    status: Optional[str] = None,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    doc_service = DocumentRequestService(db)
    requests = doc_service.get_requests_by_user(current_user.id, status=status)
    return {"requests": requests}

@router.get("/requests/{request_id}/detail")
async def get_document_request_detail(
    request_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    doc_service = DocumentRequestService(db)
    try:
        req = doc_service.get_request_detail(request_id, current_user.id, current_user.role)
        if not req:
            raise HTTPException(status_code=404, detail="Document request not found")
        return req
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/download/{request_id}")
async def download_document_certificate(
    request_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    req = db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if req.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to download this document")

    if req.status != "approved":
        raise HTTPException(status_code=400, detail="Document is not yet approved")

    if not req.certificate_path or not os.path.exists(req.certificate_path):
        raise HTTPException(status_code=404, detail="Certificate not generated")

    doc_service = DocumentRequestService(db)
    doc_service.mark_downloaded(request_id, current_user.id)

    filename = f"{req.certificate_number or 'document'}.pdf"
    return FileResponse(
        req.certificate_path,
        filename=filename,
        media_type="application/pdf"
    )

@router.get("/history")
async def get_document_history(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    doc_service = DocumentRequestService(db)
    requests = doc_service.get_requests_by_user(current_user.id)
    return {"history": requests}
