# API Reference — CampusOffice ERP

Base URL: `http://localhost:8000` (development) or `https://your-domain.com` (production)

> API docs (Swagger UI) are available at `/api/docs` in development mode only.

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### POST /api/v1/auth/login
Login and receive tokens.

**Body:**
```json
{ "email": "user@campus.edu", "password": "yourpassword" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "...", "role": "student" }
}
```

### POST /api/v1/auth/refresh
Refresh access token.

### POST /api/v1/auth/logout
Logout (invalidates refresh token).

---

## Student Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/student/dashboard | Dashboard stats |
| GET | /api/v1/student/profile | Student profile |
| GET | /api/v1/student/fee-ledger | Fee payment history |
| POST | /api/v1/student/payments | Submit payment |
| GET | /api/v1/student/results | Academic results |
| GET | /api/v1/student/documents/types | Available document types |
| POST | /api/v1/student/documents/request | Request a certificate |
| GET | /api/v1/student/documents/requests | My document requests |

---

## Staff Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/staff/dashboard | Dashboard stats |
| GET | /api/v1/staff/payments | All payment requests |
| PUT | /api/v1/staff/payments/{id}/approve | Approve payment |
| PUT | /api/v1/staff/payments/{id}/reject | Reject payment |
| GET | /api/v1/staff/documents/work-queue | Pending document requests |
| PUT | /api/v1/staff/documents/requests/{id}/review | Review document request |
| POST | /api/v1/staff/documents/requests/{id}/issue | Issue certificate |

---

## Admin Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/admin/users | All users |
| POST | /api/v1/admin/users | Create user |
| PUT | /api/v1/admin/users/{id} | Update user |
| DELETE | /api/v1/admin/users/{id} | Delete user |
| GET | /api/v1/admin/departments | Departments |
| GET | /api/v1/admin/semesters | Semesters |
| GET | /api/v1/admin/fee-structures | Fee structures |
| GET | /api/v1/admin/document-types | Document types |
| GET | /api/v1/admin/audit-logs | Audit trail |

---

## Health Endpoints

| Endpoint | Description |
|---|---|
| GET /health | Overall service health |
| GET /health/database | PostgreSQL connectivity |
| GET /health/redis | Redis connectivity |
| GET /health/storage | Upload directory writable |

---

## WebSocket

```
ws://localhost:5173/ws/notifications?token=<access_token>
```

Real-time notifications for:
- Payment approved/rejected
- Document request status changes
- New certificate ready for download
