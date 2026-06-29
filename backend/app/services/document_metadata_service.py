from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
import json
import hashlib
import os
import secrets

from ..models import DocumentMetadata, BonafideRequest, User
from ..services.request_engine_service import RequestEngineService


class DocumentMetadataService:
    def __init__(self, db: Session):
        self.db = db
        self.request_engine = RequestEngineService(db)

    def _generate_verification_code(self) -> str:
        return secrets.token_urlsafe(16)

    def _generate_certificate_number(self, prefix: str) -> str:
        year = datetime.utcnow().year
        
        latest = self.db.query(DocumentMetadata).filter(
            DocumentMetadata.certificate_number.like(f"{prefix}-{year}-%")
        ).order_by(DocumentMetadata.id.desc()).first()
        
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

    def _calculate_file_hash(self, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _generate_verification_url(self, verification_code: str) -> str:
        base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return f"{base_url}/verify/{verification_code}"

    def create_document_metadata(
        self,
        document_request_id: int,
        certificate_prefix: str,
        file_path: str,
        generated_by: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DocumentMetadata:
        verification_code = self._generate_verification_code()
        certificate_number = self._generate_certificate_number(certificate_prefix)
        verification_url = self._generate_verification_url(verification_code)
        
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
        file_hash = self._calculate_file_hash(file_path) if file_path and os.path.exists(file_path) else None
        
        doc_metadata = DocumentMetadata(
            certificate_number=certificate_number,
            document_request_id=document_request_id,
            verification_code=verification_code,
            verification_url=verification_url,
            generated_timestamp=datetime.utcnow(),
            generated_by=generated_by,
            version_number=1,
            download_counter=0,
            file_path=file_path,
            file_size=file_size,
            file_hash=file_hash,
            doc_metadata=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(doc_metadata)
        self.db.commit()
        self.db.refresh(doc_metadata)
        
        # Log activity
        self.request_engine.log_activity(
            user_id=generated_by,
            activity_type="CERTIFICATE_METADATA_CREATED",
            entity_type="document_metadata",
            entity_id=doc_metadata.id,
            description=f"Document metadata created for certificate {certificate_number}",
            reference_number=certificate_number
        )
        
        return doc_metadata

    def get_metadata_by_certificate_number(self, certificate_number: str) -> Optional[DocumentMetadata]:
        return self.db.query(DocumentMetadata).filter(
            DocumentMetadata.certificate_number == certificate_number
        ).first()

    def get_metadata_by_verification_code(self, verification_code: str) -> Optional[DocumentMetadata]:
        return self.db.query(DocumentMetadata).filter(
            DocumentMetadata.verification_code == verification_code
        ).first()

    def verify_certificate(self, certificate_number: str) -> Optional[Dict[str, Any]]:
        metadata = self.get_metadata_by_certificate_number(certificate_number)
        if not metadata:
            return None
        
        doc_request = self.db.query(BonafideRequest).filter(
            BonafideRequest.id == metadata.document_request_id
        ).first()
        
        user = self.db.query(User).filter(User.id == doc_request.user_id).first() if doc_request else None
        generator = self.db.query(User).filter(User.id == metadata.generated_by).first()
        
        is_valid = (
            metadata.archived_status == False and
            doc_request and
            doc_request.status == "approved"
        )
        
        return {
            "certificate_number": metadata.certificate_number,
            "verification_code": metadata.verification_code,
            "verification_url": metadata.verification_url,
            "status": "valid" if is_valid else "invalid",
            "is_valid": is_valid,
            "generated_timestamp": metadata.generated_timestamp.isoformat() if metadata.generated_timestamp else None,
            "generated_by": generator.full_name if generator else "N/A",
            "version_number": metadata.version_number,
            "download_counter": metadata.download_counter,
            "last_download_date": metadata.last_download_date.isoformat() if metadata.last_download_date else None,
            "archived_status": metadata.archived_status,
            "student_name": user.full_name if user else "N/A",
            "student_id": user.student_id if user else "N/A",
            "document_type": doc_request.purpose if doc_request else "N/A",
            "issue_date": metadata.generated_timestamp.strftime("%Y-%m-%d") if metadata.generated_timestamp else None,
            "metadata": json.loads(metadata.doc_metadata) if metadata.doc_metadata else None
        }

    def increment_download_counter(self, certificate_number: str) -> DocumentMetadata:
        metadata = self.get_metadata_by_certificate_number(certificate_number)
        if not metadata:
            raise ValueError("Certificate not found")
        
        metadata.download_counter += 1
        metadata.last_download_date = datetime.utcnow()
        self.db.commit()
        self.db.refresh(metadata)
        
        return metadata

    def archive_certificate(self, certificate_number: str) -> DocumentMetadata:
        metadata = self.get_metadata_by_certificate_number(certificate_number)
        if not metadata:
            raise ValueError("Certificate not found")
        
        metadata.archived_status = True
        metadata.archived_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(metadata)
        
        return metadata

    def update_qr_code_path(self, certificate_number: str, qr_code_path: str) -> DocumentMetadata:
        metadata = self.get_metadata_by_certificate_number(certificate_number)
        if not metadata:
            raise ValueError("Certificate not found")
        
        metadata.qr_code_path = qr_code_path
        self.db.commit()
        self.db.refresh(metadata)
        
        return metadata

    def get_document_stats(self) -> Dict[str, Any]:
        total_documents = self.db.query(DocumentMetadata).count()
        active_documents = self.db.query(DocumentMetadata).filter(
            DocumentMetadata.archived_status == False
        ).count()
        archived_documents = self.db.query(DocumentMetadata).filter(
            DocumentMetadata.archived_status == True
        ).count()
        
        total_downloads = self.db.query(DocumentMetadata).with_entities(
            DocumentMetadata.download_counter
        ).all()
        total_download_count = sum(count[0] for count in total_downloads)
        
        return {
            "total_documents": total_documents,
            "active_documents": active_documents,
            "archived_documents": archived_documents,
            "total_downloads": total_download_count
        }
