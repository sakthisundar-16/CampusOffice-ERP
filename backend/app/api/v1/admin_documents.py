from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from ...database import SessionLocal
from ...models import DocumentType
from ...schemas import DocumentTypeCreate, DocumentTypeUpdate, DocumentTypeResponse
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_admin

router = APIRouter(prefix="/api/v1/admin/document-types", tags=["admin-document-types"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _parse_doc_type(dt: DocumentType) -> dict:
    allowed_purposes = []
    if dt.allowed_purposes:
        try:
            allowed_purposes = json.loads(dt.allowed_purposes)
        except Exception:
            pass
    template_fields = {}
    if dt.template_fields:
        try:
            template_fields = json.loads(dt.template_fields)
        except Exception:
            pass
    return {
        "id": dt.id,
        "code": dt.code,
        "name": dt.name,
        "description": dt.description,
        "is_active": dt.is_active,
        "requires_approval": dt.requires_approval,
        "validity_days": dt.validity_days,
        "certificate_prefix": dt.certificate_prefix,
        "certificate_title": dt.certificate_title,
        "template_fields": template_fields,
        "allowed_purposes": allowed_purposes,
        "created_at": dt.created_at,
        "updated_at": dt.updated_at,
    }

@router.get("/", response_model=List[dict])
async def get_document_types(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc_types = db.query(DocumentType).offset(skip).limit(limit).all()
    return [_parse_doc_type(dt) for dt in doc_types]

@router.get("/{type_id}", response_model=dict)
async def get_document_type(
    type_id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc_type = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Document type not found")
    return _parse_doc_type(doc_type)

@router.post("/", response_model=dict)
async def create_document_type(
    type_in: DocumentTypeCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(DocumentType).filter(DocumentType.code == type_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Document type code already exists")

    type_dict = type_in.dict()
    if isinstance(type_dict.get("template_fields"), dict):
        type_dict["template_fields"] = json.dumps(type_dict["template_fields"])
    if isinstance(type_dict.get("allowed_purposes"), list):
        type_dict["allowed_purposes"] = json.dumps(type_dict["allowed_purposes"])

    db_type = DocumentType(**type_dict)
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return _parse_doc_type(db_type)

@router.put("/{type_id}", response_model=dict)
async def update_document_type(
    type_id: int,
    type_in: DocumentTypeUpdate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc_type = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Document type not found")

    update_data = type_in.dict(exclude_unset=True)
    for key in ("template_fields", "allowed_purposes"):
        if key in update_data and isinstance(update_data[key], (dict, list)):
            update_data[key] = json.dumps(update_data[key])

    for key, value in update_data.items():
        if hasattr(doc_type, key) and value is not None:
            setattr(doc_type, key, value)

    db.commit()
    db.refresh(doc_type)
    return _parse_doc_type(doc_type)

@router.delete("/{type_id}")
async def delete_document_type(
    type_id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc_type = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Document type not found")

    active_requests = db.query(DocumentRequest).filter(
        DocumentRequest.document_type_id == type_id,
        DocumentRequest.status == "pending"
    ).count()
    if active_requests > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {active_requests} pending requests exist for this document type"
        )

    doc_type.is_active = False
    db.commit()
    return {"message": "Document type deactivated successfully"}

@router.put("/{type_id}/activate")
async def activate_document_type(
    type_id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc_type = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Document type not found")

    doc_type.is_active = True
    db.commit()
    return {"message": "Document type activated successfully"}
