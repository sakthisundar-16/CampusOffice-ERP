# CampusOffice ERP — Complete Project Documentation

> A production-deployed, full-stack Enterprise Resource Planning system for educational institutions.

---

## 1. Project Overview

**CampusOffice ERP** is a digital transformation solution designed to eliminate the paperwork and manual bottlenecks found in traditional campus administration. It replaces physical payment challans, manual document stamping, printed fee receipts, and email-based approval chains with a unified, real-time digital platform.

The system supports three distinct user roles — **Student**, **Staff**, and **Admin** — each with a fully-featured, role-locked dashboard. All three roles operate simultaneously on the same data with live updates powered by WebSocket technology.

### The Problem It Solves

| Traditional Process | CampusOffice ERP Solution |
|---------------------|--------------------------|
| Students queue at the finance office to submit fee challans | Students upload payment proof online and track status in real-time |
| Staff manually verify challan books and stamp receipts | Staff review scanned proof, click approve — receipt auto-generated as PDF |
| Students collect bonafide letters physically from admin | Students apply online; staff generate and digitally sign the certificate |
| Result declaration by notice board or email blast | Staff publish results → students see them instantly |
| No audit trail for administrative actions | Every action (login, approval, rejection) is logged with timestamp and IP |

---

## 2. Live Deployment

| Resource | URL |
|----------|-----|
| 🌍 Live Application | https://campus-office-erp.vercel.app |
| 📦 Source Code | https://github.com/sakthisundar-16/CampusOffice-ERP |
| 🔌 Backend API | https://campusoffice-erp-backend.onrender.com |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| 🔧 Admin | `admin@campus.edu` | `admin123` |
| 🧑‍💼 Staff | `staff@campus.edu` | `staff123` |
| 🎒 Student | `student@campus.edu` | `student123` |

---

## 3. Technology Stack

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5 | Build tool & dev server |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Server-state management & caching |
| Axios | — | HTTP client |
| WebSocket (native) | — | Real-time notifications |
| Lucide React | — | Icon system |
| React Hot Toast | — | Toast notifications |
| Vanilla CSS | — | Custom design system |

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| FastAPI | 0.100+ | REST API & WebSocket server |
| Python | 3.12 | Runtime |
| SQLAlchemy | 2.x | ORM |
| Alembic | — | Database migrations |
| Pydantic / Pydantic-Settings | v2 | Schema validation & config |
| python-jose | — | JWT token generation & validation |
| passlib + bcrypt | — | Secure password hashing |
| ReportLab | — | PDF generation (receipts, certificates) |
| qrcode | — | QR code generation for certificate verification |
| Redis (asyncio) | 7 | Pub/sub & caching |
| Uvicorn | — | ASGI production server |

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend Hosting | Vercel | Global CDN deployment |
| Backend Hosting | Render | Managed Python web service |
| Database | Neon (Serverless Postgres) | Cloud PostgreSQL |
| Cache / Queue | Upstash (Serverless Redis) | Cloud Redis |
| Containerization | Docker + Docker Compose | Local development |

---

## 4. System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React SPA — campus-office-erp.vercel.app     │   │
│  │                                                      │   │
│  │  ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │   │
│  │  │ /student │ │ /staff  │ │ /admin  │ │ /verify  │ │   │
│  │  └──────────┘ └─────────┘ └─────────┘ └──────────┘ │   │
│  │  AuthProvider + ProtectedRoute + TanStack Query      │   │
│  │  WebSocketContext (live notification push)           │   │
│  └──────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTPS REST / WSS WebSocket
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  FastAPI Backend — campusoffice-erp-backend.onrender.com     │
│                                                              │
│  CORSMiddleware → TrustedHostMiddleware → JWT Auth Guards    │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ REST API │  │  WebSocket   │  │  /uploads/* (media)  │  │
│  │ Routers  │  │ /ws/notifs   │  └──────────────────────┘  │
│  └────┬─────┘  └──────┬───────┘                            │
│       │               │                                     │
│  ┌────▼───────────────▼─────────────────────────────────┐  │
│  │                  Service Layer                        │  │
│  │  PaymentSvc | BonafideSvc | PDFSvc | ResultSvc       │  │
│  │  NotificationSvc | WorkflowAutomationSvc | AuditSvc  │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼────────────────────────────────┐  │
│  │             SQLAlchemy ORM (18+ Models)               │  │
│  └──────────┬──────────────────────────┬─────────────────┘  │
└─────────────┼──────────────────────────┼────────────────────┘
              ▼                          ▼
   ┌──────────────────┐       ┌─────────────────────┐
   │  Neon PostgreSQL │       │   Upstash Redis      │
   │  (Primary DB)    │       │   (Cache + Pub/Sub)  │
   └──────────────────┘       └─────────────────────┘
```

### Key Architectural Decisions

1. **Service Layer Pattern** — All business logic lives in dedicated service classes, keeping API route handlers thin and focused purely on HTTP concerns.

2. **Workflow Automation Service** — A dedicated `WorkflowAutomationService` orchestrates multi-step operations (e.g., "payment approved" triggers: receipt generation → notification → audit log → cache invalidation), ensuring consistency.

3. **Unified Request Engine** — A `UnifiedRequest` model acts as a common envelope for all student requests (payment, document, bonafide), with a `RequestTimeline` table tracking every state change with actor, timestamp, and IP address.

4. **WebSocket Manager** — A custom `websocket_manager` maintains live connections per user. When a payment is approved, the backend pushes a notification directly to the student's WebSocket connection.

5. **RBAC via Dependency Injection** — FastAPI's `Depends()` system injects role-checking guards (`require_student`, `require_staff`) directly at the route level.

---

## 5. Database Schema

### Entity Relationship Overview

```
users (1) ──< (M) payment_requests
users (1) ──< (M) bonafide_requests
users (1) ──< (M) results
users (1) ──< (M) notifications
users (1) ──< (M) unified_requests
users (1) ──  (1) students
users (1) ──  (1) staff
users (1) ──  (1) admins

departments (1) ──< (M) users
departments (1) ──< (M) students
semesters (1) ──< (M) fee_structures
unified_requests (1) ──< (M) request_timeline
bonafide_requests (1) ── (1) document_metadata
```

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | Central identity table for all roles |
| `students` | Academic profile (roll no., semester, GPA) |
| `staff` | Employment profile (staff ID, hire date) |
| `departments` | Academic departments |
| `semesters` | Academic terms with start/end dates |
| `fee_structures` | Per-semester fee item definitions |
| `payment_requests` | Fee submission records + approval status |
| `results` | GPA, marks, grade per student per semester |
| `bonafide_requests` | Certificate applications with status |
| `unified_requests` | Universal request tracking envelope |
| `request_timeline` | Per-step audit: who, what, when, from where |
| `notifications` | Per-user in-app alert records |
| `audit_logs` | Security log for every sensitive action |
| `document_metadata` | Certificate numbers, QR codes, download counts |
| `login_history` | Login event tracking per user |

---

## 6. Feature Walkthrough

### 6.1 Student Flow: Fee Payment

```
Student                 System                     Staff
   │                       │                          │
   │── Upload proof ───────►│                          │
   │   (amount, UPI ref)    │── PaymentRequest created │
   │                        │   (status: pending)      │
   │                        │── WS Notification ───────►│
   │                        │                          │
   │                        │◄── Staff clicks Approve ─│
   │                        │                          │
   │                        │── WorkflowAutomation:    │
   │                        │   1. Update status       │
   │                        │   2. Generate PDF receipt│
   │                        │   3. Send notification   │
   │                        │   4. Write audit log     │
   │                        │   5. Invalidate cache    │
   │                        │                          │
   │◄── Live WS push ───────│                          │
   │   "Payment Approved!"  │                          │
   │                        │                          │
   │── Click Download ──────►│                          │
   │◄── PDF Receipt ────────│                          │
```

### 6.2 Student Flow: Bonafide Certificate

```
Student            System               Staff
   │                  │                    │
   │── Apply ─────────►│                   │
   │  (purpose, date)  │── BonafideRequest  │
   │                   │   (pending)        │── WS Notification
   │                   │◄── Approve ────────│
   │                   │                   │
   │                   │── PDFService:      │
   │                   │   Generate cert    │
   │                   │   with QR code     │
   │                   │── DocumentMetadata:│
   │                   │   Unique cert no.  │
   │                   │   Verification URL │
   │◄── WS Push ───────│                   │
   │  "Certificate Ready"                  │
   │── Download PDF ───►│                   │
   │◄── PDF with QR ───│                   │
   │                   │                   │
   Anyone scans QR → GET /verify/{cert_no} → Verified ✓
```

### 6.3 Real-Time Notification Flow

```
Backend Service        Redis          WebSocket Manager    Browser
      │                  │                   │                │
      │── Publish ───────►│                  │                │
      │   (user_id, data) │── Deliver ────────►│               │
      │                  │                   │── Push JSON ───►│
      │                  │                   │               │
      │                  │                   │  Toast + badge │
      │                  │                   │  update live   │
```

---

## 7. Security Architecture

| Mechanism | Implementation | Coverage |
|-----------|----------------|---------|
| **Authentication** | JWT (HS256), 24hr expiry | All protected routes |
| **Password Storage** | bcrypt with salt (passlib) | User creation & login |
| **RBAC** | FastAPI `Depends()` guards per route | All API endpoints |
| **CORS** | Strict allowlist (only Vercel domain) | All API responses |
| **Audit Log** | DB-backed record of every sensitive operation | Login, approvals, admin actions |
| **Error Masking** | Global exception handler — no stack traces in responses | All endpoints |
| **Certificate Verification** | Unique verification code + file hash in `document_metadata` | All issued certificates |

---

## 8. PDF Generation

Two document types generated server-side using **ReportLab**:

### Fee Receipt
- Student name, roll number, payment amount, date, transaction ID, bank/UPI details
- Embedded QR code encoding the receipt ID and transaction ID
- Stamped with receipt number, verified-by staff name, generation timestamp

### Bonafide Certificate
- Student name, roll number, department, admission date, current semester
- Embedded QR code linking to the public verification URL
- Tracked in `document_metadata` with certificate number, verification code, file hash, download counter

---

## 9. API Design

REST API with `/api/v1/` versioned prefix. All responses are JSON. All protected endpoints require a Bearer token.

### Authentication Example

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin@campus.edu",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": { "id": 1, "role": "admin", "full_name": "Super Admin" }
}
```

### Key Endpoint Groups

```
# Student
GET  /api/v1/student/dashboard
GET  /api/v1/student/bonafides
POST /api/v1/student/bonafides
GET  /api/v1/student/payments/{id}/receipt

# Staff
GET  /api/v1/staff/payments
PUT  /api/v1/staff/payments/{id}/approve
PUT  /api/v1/staff/payments/{id}/reject
POST /api/v1/staff/bonafides/{id}/approve

# Admin
GET  /api/v1/admin/users
POST /api/v1/admin/users
GET  /api/v1/admin/departments
POST /api/v1/admin/semesters
POST /api/v1/admin/fee-structures

# Public
GET  /verify/{certificate_number}

# WebSocket
WS   /ws/notifications?token=<jwt>
```

---

## 10. Frontend Architecture

### Component Hierarchy

```
App.tsx
├── AuthProvider          (JWT management, user state)
├── WebSocketProvider     (persistent WSS connection per user)
├── QueryClientProvider   (TanStack Query)
└── Routes
    ├── /login            → Login.tsx
    ├── /verify/:id       → VerifyCertificate.tsx  (public)
    │
    ├── /student/*        → ProtectedRoute (role=student)
    │   └── Layout
    │       ├── Dashboard.tsx
    │       ├── Payments.tsx
    │       ├── Results.tsx
    │       ├── Documents.tsx
    │       ├── Bonafide.tsx
    │       └── Profile.tsx
    │
    ├── /staff/*          → ProtectedRoute (role=staff)
    │   └── Layout
    │       ├── Dashboard.tsx
    │       ├── Payments.tsx      (approval workflow)
    │       ├── PaymentHistory.tsx
    │       ├── Documents.tsx
    │       ├── Bonafides.tsx
    │       └── Results.tsx
    │
    └── /admin/*          → ProtectedRoute (role=admin)
        └── Layout
            ├── Dashboard.tsx
            ├── Users.tsx
            ├── Students.tsx
            ├── Staff.tsx
            ├── Departments.tsx
            ├── Semesters.tsx
            ├── FeeStructures.tsx
            └── DocumentTypes.tsx
```

### State Management Strategy

| Type of State | Tool |
|--------------|------|
| Server data (API responses) | TanStack Query |
| Auth state (user, token) | Context + localStorage |
| Real-time events | WebSocket + `queryClient.invalidateQueries()` |
| Local UI state (modals, forms) | React `useState` |

---

## 11. Deployment Architecture

### CI/CD Pipeline

```
git push → GitHub (main branch)
               │
               ├──► Vercel detects push
               │    npm install --legacy-peer-deps
               │    vite build
               │    Deploy to global CDN
               │
               └──► Render detects push
                    pip install -r requirements.txt
                    uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Docker Local Setup

```
docker-compose up --build
```
Starts four containers:
- `postgres` — PostgreSQL 16 on port 5432 (persistent volume)
- `redis` — Redis 7 on port 6379
- `backend` — FastAPI on port 8000
- `frontend` — Nginx-served React build on port 5173

All containers communicate via internal `campus_net` bridge — database is never publicly exposed.

---

## 12. Project Statistics

| Metric | Count |
|--------|-------|
| Backend API routes | 70+ |
| Frontend pages | 20 |
| Database tables | 18 |
| Service classes | 12 |
| Lines of code (backend) | ~12,000 |
| Lines of code (frontend) | ~18,000 |
| Real-time WebSocket event types | 5 |
| PDF document types | 2 |
| User roles | 3 |

---

## 13. Key Technical Highlights for Judges

1. **Production Deployed** — Runs live with real Neon PostgreSQL, real Upstash Redis, real automated CI/CD. Not just localhost.

2. **Real-Time Without Polling** — WebSocket connections are maintained per authenticated user. Approvals and results appear instantly on the student's screen without any page refresh.

3. **Server-Side PDF Generation** — Fee receipts and bonafide certificates are generated as proper PDFs server-side using ReportLab, each with an embedded QR code.

4. **End-to-End Certificate Verification** — A bonafide certificate's QR code leads to a public URL where anyone (employer, institution) can independently verify the document's authenticity without logging in.

5. **Audit Trail** — Every administrative action is immutably logged with the acting user, IP address, user agent, and timestamp.

6. **Multi-Role Architecture** — Three completely different user experiences from a single codebase, enforced at both the frontend route level (`ProtectedRoute`) and backend API level (`require_student`, `require_staff` RBAC guards).

7. **Docker-Ready** — A single `docker-compose up --build` spins up the full four-service stack on any machine with Docker installed.

8. **Workflow Automation** — The `WorkflowAutomationService` makes approvals transactionally safe: receipt generation, notification delivery, audit logging, and cache invalidation are always executed together as a single orchestrated operation.
