DEFAULT_TUITION_FEE_AMOUNT = 50000.0

from app.database import engine
from app.core.security import get_password_hash
from datetime import datetime
from sqlalchemy import text

def seed():
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                TRUNCATE TABLE users, admins, staff, students, departments, semesters, fee_structures,
                payment_requests, bonafide_requests, document_types, document_requests, certificate_archives,
                results, subjects, student_results, notifications, login_history, audit_logs,
                result_files, system_settings, payment_approvals, admin_staff_assignments, departments_overseen
                RESTART IDENTITY CASCADE
            """))
            conn.commit()
            print("All tables truncated successfully")
        except Exception as e:
            print(f"Truncate error (may not exist yet): {e}")

        departments = [
            ('Computer Science', 'CSE'),
            ('Information Technology', 'IT'),
            ('Artificial Intelligence and Data Science', 'AIDS'),
            ('Electrical and Electronics Engineering', 'EEE'),
            ('Electronics and Communication Engineering', 'ECE'),
            ('Civil Engineering', 'CIVIL'),
            ('Mechanical Engineering', 'MECH'),
        ]

        dept_ids = {}
        for name, code in departments:
            try:
                conn.execute(text("""
                    INSERT INTO departments (name, code, created_at, updated_at)
                    VALUES (:name, :code, :now, :now)
                """), {"name": name, "code": code, "now": datetime.utcnow()})
                conn.commit()
                result = conn.execute(text("SELECT id FROM departments WHERE code = :code"), {"code": code})
                dept_id = result.scalar()
                dept_ids[code] = dept_id
                print(f"Created department: {name} ({code}) id={dept_id}")
            except Exception as e:
                print(f"Dept insert error for {code}: {e}")

        try:
            conn.execute(text("""
                INSERT INTO semesters (name, academic_year, start_date, end_date, is_current, created_at, updated_at)
                VALUES ('2025-2026-FALL', '2025-2026', :sd, :ed, true, :now, :now)
            """), {"sd": datetime(2025, 8, 1), "ed": datetime(2025, 12, 15), "now": datetime.utcnow()})
            conn.commit()
            result = conn.execute(text("SELECT id FROM semesters LIMIT 1"))
            sem_id = result.scalar()
            print(f"Created semester: 2025-2026-FALL (id={sem_id})")
        except Exception as e:
            print(f"Semester insert error: {e}")

        try:
            conn.execute(text("""
                INSERT INTO fee_structures (semester_id, fee_name, amount, due_date, is_active, created_at, updated_at)
                VALUES ((SELECT id FROM semesters LIMIT 1), 'Tuition Fee', :amount, :dd, true, :now, :now)
            """), {"amount": DEFAULT_TUITION_FEE_AMOUNT, "dd": datetime(2025, 9, 1), "now": datetime.utcnow()})
            conn.commit()
            print(f"Created fee structure: Tuition Fee = {DEFAULT_TUITION_FEE_AMOUNT}")
        except Exception as e:
            print(f"Fee insert error: {e}")

        users = [
            ("admin@campus.edu", "admin123", "System Administrator", "ADMIN", None),
            ("staff@campus.edu", "staff123", "Office Staff", "STAFF", "STF-GEN"),
            ("student@campus.edu", "student123", "Generic Student", "STUDENT", "STU-GEN"),
        ]
        user_ids = {}
        for email, pwd, name, role, sid in users:
            try:
                result = conn.execute(text("""
                    INSERT INTO users (email, hashed_password, full_name, role, student_id, is_active, created_at, updated_at)
                    VALUES (:e, :h, :n, :r, :s, true, :now, :now)
                    RETURNING id
                """), {"e": email, "h": get_password_hash(pwd), "n": name, "r": role, "s": sid, "now": datetime.utcnow()})
                uid = result.scalar()
                conn.commit()
                user_ids[role] = uid
                print(f"Created user: {email} ({role}) uid={uid}")
            except Exception as e:
                print(f"User insert error for {email}: {e}")

        try:
            conn.execute(text("""
                INSERT INTO admins (user_id, employee_id, hire_date, created_at, updated_at)
                VALUES (:uid, 'EMP001', :hd, :now, :now)
            """), {"uid": user_ids.get("ADMIN"), "hd": datetime(2020, 1, 1), "now": datetime.utcnow()})
            conn.commit()
            print("Created admin profile: EMP001")
        except Exception as e:
            print(f"Admin insert error: {e}")

        dept_codes = ['CSE', 'IT', 'AIDS', 'EEE', 'ECE', 'CIVIL', 'MECH']
        staff_names = {
            'CSE': 'Dr. Rajesh Kumar', 'IT': 'Dr. Priya Sharma', 'AIDS': 'Dr. Anil Verma',
            'EEE': 'Dr. Sunita Patel', 'ECE': 'Dr. Vikram Singh', 'CIVIL': 'Dr. Meena Joshi',
            'MECH': 'Dr. Arvind Reddy',
        }
        student_names = {
            'CSE': 'Rahul CSE', 'IT': 'Priya IT', 'AIDS': 'Amit AIDS',
            'EEE': 'Sneha EEE', 'ECE': 'Karthik ECE', 'CIVIL': 'Divya CIVIL', 'MECH': 'Ravi MECH',
        }
        admin_names = {
            'CSE': 'Admin CSE', 'IT': 'Admin IT', 'AIDS': 'Admin AIDS',
            'EEE': 'Admin EEE', 'ECE': 'Admin ECE', 'CIVIL': 'Admin CIVIL', 'MECH': 'Admin MECH',
        }

        for code in dept_codes:
            dept_id = dept_ids.get(code)
            if not dept_id:
                print(f"Skipping {code}: department not found")
                continue

            staff_email = f"staff_{code.lower()}@campus.edu"
            student_email = f"student_{code.lower()}@campus.edu"
            admin_email = f"admin_{code.lower()}@campus.edu"
            student_roll = f"{code}2024001"

            for email, pwd, name, role, sid in [
                (staff_email, "staff123", staff_names[code], "STAFF", f"STF-{code}"),
                (student_email, "student123", student_names[code], "STUDENT", student_roll),
                (admin_email, "admin123", admin_names[code], "ADMIN", f"ADM-{code}"),
            ]:
                try:
                    result = conn.execute(text("""
                        INSERT INTO users (email, hashed_password, full_name, role, student_id, department_id, is_active, created_at, updated_at)
                        VALUES (:e, :h, :n, :r, :s, :did, true, :now, :now)
                        RETURNING id
                    """), {"e": email, "h": get_password_hash(pwd), "n": name, "r": role, "s": sid, "did": dept_id, "now": datetime.utcnow()})
                    uid = result.scalar()
                    conn.commit()
                    user_ids[f"{code}_{role}"] = uid
                    print(f"Created user: {email} ({role}) dept={code} uid={uid}")
                except Exception as e:
                    print(f"User insert error for {email}: {e}")

            try:
                conn.execute(text("""
                    INSERT INTO staff (user_id, staff_id, hire_date, department_id, created_at, updated_at)
                    VALUES (:uid, :sid, :hd, :did, :now, :now)
                """), {"uid": user_ids.get(f"{code}_STAFF"), "sid": f"STF-{code}", "hd": datetime(2020, 1, 1), "did": dept_id, "now": datetime.utcnow()})
                conn.commit()
                print(f"Created staff profile: {code} ({staff_names[code]})")
            except Exception as e:
                print(f"Staff insert error for {code}: {e}")

            try:
                conn.execute(text("""
                    INSERT INTO students (user_id, roll_number, admission_date, current_semester, department_id, gpa, created_at, updated_at)
                    VALUES (:uid, :rn, :ad, 1, :did, '8.5', :now, :now)
                """), {"uid": user_ids.get(f"{code}_STUDENT"), "rn": student_roll, "ad": datetime(2024, 8, 1), "did": dept_id, "now": datetime.utcnow()})
                conn.commit()
                print(f"Created student profile: {code} ({student_names[code]})")
            except Exception as e:
                print(f"Student insert error for {code}: {e}")

            try:
                conn.execute(text("""
                    INSERT INTO admins (user_id, employee_id, hire_date, created_at, updated_at)
                    VALUES (:uid, :eid, :hd, :now, :now)
                """), {"uid": user_ids.get(f"{code}_ADMIN"), "eid": f"ADM-{code}", "hd": datetime(2020, 1, 1), "now": datetime.utcnow()})
                conn.commit()
                print(f"Created admin profile: {code} ({admin_names[code]})")
            except Exception as e:
                print(f"Admin insert error for {code}: {e}")

        doc_types = [
            ('BONAFIDE', 'Bonafide Certificate', 'Certificate of status/study verification for passport, visa, or scholarship applications', True, True, 365, 'CERT', 'Bonafide Certificate', '{}', '["Passport","Visa","Scholarship","Bank Loan","Other"]'),
            ('CONDUCT', 'Conduct Certificate', 'Certificate of good conduct/character verification', True, True, 365, 'CERT', 'Conduct Certificate', '{}', '["Higher Studies","Employment","Visa","Other"]'),
            ('FEE_PAID', 'Fee Paid Certificate', 'Certificate confirming all semester fees have been paid', True, True, 180, 'CERT', 'Fee Paid Certificate', '{}', '["Visa","Scholarship","Loan","Other"]'),
            ('INTERNSHIP', 'Internship Permission Letter', 'Letter granting permission for off-campus internship/project work', True, True, 90, 'CERT', 'Internship Permission Letter', '{}', '["Summer Internship","Winter Internship","Project Work","Other"]'),
            ('COURSE_COMPLETION', 'Course Completion Certificate', 'Certificate confirming completion of course/program requirements', True, False, None, 'CERT', 'Course Completion Certificate', '{}', '["Higher Studies","Employment","Other"]'),
        ]

        for code, name, desc, active, appr_required, val_days, prefix, title, tmpl, purposes in doc_types:
            try:
                conn.execute(text("""
                    INSERT INTO document_types (code, name, description, is_active, requires_approval, validity_days, certificate_prefix, certificate_title, template_fields, allowed_purposes, created_at, updated_at)
                    VALUES (:code, :name, :desc, :active, :appr, :val, :prefix, :title, :tmpl, :purp, :now, :now)
                """), {
                    "code": code, "name": name, "desc": desc, "active": active, "appr": appr_required,
                    "val": val_days, "prefix": prefix, "title": title, "tmpl": tmpl, "purp": purposes,
                    "now": datetime.utcnow()
                })
                conn.commit()
                print(f"Created document type: {name}")
            except Exception as e:
                print(f"Document type insert error for {code}: {e}")

    print("\n=== SEED COMPLETE ===")
    print("Login credentials:")
    print("  Admin   -> admin@campus.edu / admin123")
    print("  Staff   -> staff@campus.edu / staff123")
    print("  Student -> student@campus.edu / student123")
    print("======================\n")

if __name__ == "__main__":
    seed()
