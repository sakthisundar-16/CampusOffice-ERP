# Database Schema — CampusOffice ERP

## Technology
- PostgreSQL 16
- ORM: SQLAlchemy 2.x
- Connection Pool: size=20, overflow=40, pre_ping=True, recycle=3600s

---

## Core Tables

### users
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| email | VARCHAR UNIQUE | Not null |
| password_hash | VARCHAR | bcrypt |
| full_name | VARCHAR | |
| role | ENUM | student / staff / admin |
| student_id | VARCHAR | Student roll number |
| department_id | FK → departments | |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMP | |

### students (profile)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → users | Unique |
| batch | VARCHAR | |
| quota | VARCHAR | Govt/Management |
| section | VARCHAR | |

### staff
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → users | Unique |
| designation | VARCHAR | |
| department_id | FK → departments | |

### departments
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | VARCHAR UNIQUE | |
| code | VARCHAR UNIQUE | e.g. CSE, ECE |

### semesters
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | VARCHAR | |
| academic_year | VARCHAR | |
| is_active | BOOLEAN | |

---

## Fee Management

### fee_structures
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| semester_id | FK → semesters | |
| fee_name | VARCHAR | |
| amount | NUMERIC | |
| is_active | BOOLEAN | |

### payment_requests
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| request_id | VARCHAR UNIQUE | e.g. PAYREQ-2024-CSE-000001 |
| user_id | FK → users | |
| semester_id | FK → semesters | |
| amount_paid | NUMERIC | |
| transaction_id | VARCHAR | |
| status | ENUM | pending / completed / rejected |
| payment_proof | VARCHAR | File path |
| receipt_number | VARCHAR | |
| receipt_path | VARCHAR | |
| verified_by | FK → users | Staff |
| verified_at | TIMESTAMP | |

---

## Document Management

### document_types
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | VARCHAR | |
| certificate_prefix | VARCHAR | e.g. BON, TC, CC |
| is_active | BOOLEAN | |
| requires_approval | BOOLEAN | |

### document_requests
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| request_number | VARCHAR UNIQUE | |
| user_id | FK → users | |
| document_type_id | FK → document_types | |
| status | ENUM | pending / approved / rejected / issued |
| purpose | TEXT | |
| certificate_path | VARCHAR | Generated PDF path |
| issued_by | FK → users | Staff |
| issued_at | TIMESTAMP | |

### bonafide_requests
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → users | |
| purpose | TEXT | |
| status | ENUM | pending / approved / rejected |
| certificate_path | VARCHAR | |

---

## Audit & Notifications

### audit_logs
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → users | |
| action | VARCHAR | e.g. PAYMENT_APPROVE |
| details | TEXT | |
| ip_address | VARCHAR | |
| user_agent | TEXT | |
| created_at | TIMESTAMP | |

### notifications
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | FK → users | |
| title | VARCHAR | |
| message | TEXT | |
| is_read | BOOLEAN | Default false |
| created_at | TIMESTAMP | |

---

## Connection Pooling

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Active connections
    max_overflow=40,     # Burst connections
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections every hour
    echo=False           # No SQL logging in production
)
```
