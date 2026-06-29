import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/campus_erp")
engine = create_engine(DATABASE_URL)

def run_sql(conn, sql, label):
    try:
        with conn.begin() as txn:
            conn.execute(text(sql))
        print(f"OK: {label}")
    except Exception as e:
        print(f"Skipped {label}: {e}")

def migrate():
    with engine.connect() as conn:
        run_sql(conn, "ALTER TABLE semesters ADD COLUMN IF NOT EXISTS academic_year VARCHAR NOT NULL DEFAULT '2025-2026'", "add academic_year")
        run_sql(conn, "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS semester_id INTEGER REFERENCES semesters(id)", "add semester_id")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS document_types (
                id SERIAL PRIMARY KEY,
                code VARCHAR NOT NULL UNIQUE,
                name VARCHAR NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                requires_approval BOOLEAN DEFAULT TRUE,
                validity_days INTEGER,
                certificate_prefix VARCHAR NOT NULL,
                certificate_title VARCHAR NOT NULL,
                template_fields TEXT,
                allowed_purposes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """, "create document_types")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS document_requests (
                id SERIAL PRIMARY KEY,
                request_number VARCHAR NOT NULL UNIQUE,
                user_id INTEGER NOT NULL REFERENCES users(id),
                document_type_id INTEGER NOT NULL REFERENCES document_types(id),
                purpose VARCHAR,
                reason TEXT,
                required_date TIMESTAMP,
                additional_notes TEXT,
                attachment_path VARCHAR,
                status VARCHAR DEFAULT 'pending',
                reviewed_by INTEGER REFERENCES users(id),
                reviewed_at TIMESTAMP,
                review_remarks TEXT,
                certificate_path VARCHAR,
                certificate_number VARCHAR UNIQUE,
                verification_code VARCHAR,
                issued_at TIMESTAMP,
                issued_by INTEGER REFERENCES users(id),
                downloaded_at TIMESTAMP,
                is_archived BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """, "create document_requests")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS certificate_archives (
                id SERIAL PRIMARY KEY,
                certificate_number VARCHAR NOT NULL UNIQUE,
                request_id INTEGER NOT NULL REFERENCES document_requests(id),
                document_type_id INTEGER NOT NULL REFERENCES document_types(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                issued_by INTEGER REFERENCES users(id),
                issued_at TIMESTAMP,
                archived_at TIMESTAMP DEFAULT NOW(),
                file_path VARCHAR NOT NULL,
                verification_code VARCHAR
            )
        """, "create certificate_archives")

        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_document_requests_user ON document_requests(user_id)", "idx user_id")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status)", "idx status")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_document_requests_cert_number ON document_requests(certificate_number)", "idx cert_number")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_cert_archives_cert_number ON certificate_archives(certificate_number)", "idx archive cert_number")

        run_sql(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR", "add notification category")
        run_sql(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE", "add notification is_archived")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category, is_archived)", "idx notifications user category")

        # Unified Request System Tables
        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS unified_requests (
                id SERIAL PRIMARY KEY,
                request_number VARCHAR NOT NULL UNIQUE,
                request_type VARCHAR NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR DEFAULT 'submitted',
                priority VARCHAR DEFAULT 'normal',
                reference_id INTEGER,
                reference_type VARCHAR,
                department_id INTEGER REFERENCES departments(id),
                semester_id INTEGER REFERENCES semesters(id),
                academic_year VARCHAR,
                submitted_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP,
                processed_by INTEGER REFERENCES users(id),
                remarks TEXT,
                metadata TEXT
            )
        """, "create unified_requests")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS request_timeline (
                id SERIAL PRIMARY KEY,
                request_id INTEGER NOT NULL REFERENCES unified_requests(id),
                status VARCHAR NOT NULL,
                stage VARCHAR NOT NULL,
                description TEXT,
                actor_id INTEGER REFERENCES users(id),
                actor_role VARCHAR,
                ip_address VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """, "create request_timeline")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS activity_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                activity_type VARCHAR NOT NULL,
                entity_type VARCHAR,
                entity_id INTEGER,
                description TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                reference_number VARCHAR,
                ip_address VARCHAR,
                user_agent VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """, "create activity_history")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS document_metadata (
                id SERIAL PRIMARY KEY,
                certificate_number VARCHAR NOT NULL UNIQUE,
                document_request_id INTEGER REFERENCES bonafide_requests(id),
                verification_code VARCHAR NOT NULL UNIQUE,
                verification_url VARCHAR,
                qr_code_path VARCHAR,
                generated_timestamp TIMESTAMP DEFAULT NOW(),
                generated_by INTEGER REFERENCES users(id),
                version_number INTEGER DEFAULT 1,
                digital_signature TEXT,
                download_counter INTEGER DEFAULT 0,
                last_download_date TIMESTAMP,
                archived_status BOOLEAN DEFAULT FALSE,
                archived_at TIMESTAMP,
                file_path VARCHAR NOT NULL,
                file_size INTEGER,
                file_hash VARCHAR,
                metadata TEXT
            )
        """, "create document_metadata")

        run_sql(conn, """
            CREATE TABLE IF NOT EXISTS system_health (
                id SERIAL PRIMARY KEY,
                service_name VARCHAR NOT NULL UNIQUE,
                status VARCHAR DEFAULT 'healthy',
                last_check TIMESTAMP DEFAULT NOW(),
                response_time_ms INTEGER,
                error_message TEXT,
                metadata TEXT
            )
        """, "create system_health")

        # Indexes for new tables
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_unified_requests_user ON unified_requests(user_id)", "idx unified_requests user")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_unified_requests_status ON unified_requests(status)", "idx unified_requests status")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_unified_requests_type ON unified_requests(request_type)", "idx unified_requests type")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_request_timeline_request ON request_timeline(request_id)", "idx request_timeline request")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_activity_history_user ON activity_history(user_id)", "idx activity_history user")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_activity_history_type ON activity_history(activity_type)", "idx activity_history type")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_document_metadata_cert_number ON document_metadata(certificate_number)", "idx document_metadata cert_number")
        run_sql(conn, "CREATE INDEX IF NOT EXISTS idx_document_metadata_verification_code ON document_metadata(verification_code)", "idx document_metadata verification_code")

        print("\nMigration completed!")

if __name__ == "__main__":
    migrate()