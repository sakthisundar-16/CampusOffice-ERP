from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
from ...database import SessionLocal
from ...models import DocumentRequest, DocumentType
from ...services.document_request_service import DocumentRequestService

router = APIRouter(prefix="/api/v1", tags=["verification"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/verify/{certificate_number}")
async def verify_certificate_public(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    service = DocumentRequestService(db)
    result = service.verify_certificate(certificate_number)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found. Please check the certificate number and verification code."
        )

    is_valid = result.get("is_valid", False)
    if not is_valid:
        return {
            **result,
            "verification_status": "invalid",
            "message": "This certificate is no longer valid. It may have been revoked or expired.",
        }

    return {
        **result,
        "verification_status": "valid",
        "message": "This certificate is valid and was issued by CampusOffice ERP.",
    }

@router.get("/documents/{request_id}/preview")
async def preview_document(
    request_id: int,
    db: Session = Depends(get_db)
):
    req = db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if req.status != "approved":
        raise HTTPException(status_code=400, detail="Document is not approved")

    if not req.certificate_path or not os.path.exists(req.certificate_path):
        raise HTTPException(status_code=404, detail="Certificate not generated")

    filename = f"{req.certificate_number or 'document'}.pdf"
    return FileResponse(req.certificate_path, filename=filename, media_type="application/pdf")
