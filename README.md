<div align="center">

# 🎓 CampusOffice ERP

### A Full-Stack, Enterprise-Grade Campus Management System

**Live Demo:** [campus-office-erp.vercel.app](https://campus-office-erp.vercel.app)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [User Roles & Modules](#-user-roles--modules)
- [Getting Started (Local)](#-getting-started-local)
- [Docker Deployment](#-docker-deployment)
- [Cloud Deployment](#-cloud-deployment)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)

---

## 🎯 Overview

**CampusOffice ERP** is a fully-featured, production-deployed Enterprise Resource Planning system purpose-built for educational institutions. It digitalizes and automates the end-to-end administrative workflows of a campus — from student fee payments and academic results to official document generation and real-time staff notifications.

The system is designed with a **role-based, multi-tenant architecture** supporting three distinct user roles: **Students**, **Staff**, and **Administrators**, each with their own tailored dashboards and permissions.

---

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based stateless authentication with configurable token expiry
- Role-Based Access Control (RBAC) — route-level and API-level enforcement
- Bcrypt password hashing
- Audit logs for every critical action (login, approvals, data changes)
- Global exception handler to prevent internal error leakage

### 💳 Fee Payment Management
- Students upload payment proof (screenshot/receipt) with UPI reference or bank details
- Staff review, approve, or reject payments with comments
- On approval: PDF fee receipt auto-generated with QR code verification
- Payment resubmission for rejected payments
- Complete payment history for all parties

### 📄 Document & Bonafide Requests
- Students submit bonafide certificate requests with purpose and date
- Staff review and digitally generate PDF bonafide certificates
- Each certificate has a **unique verification code** and QR code
- Public certificate verification endpoint — anyone can verify authenticity via URL
- Document metadata tracking (download count, version, file hash)

### 📊 Academic Results
- Staff publish semester results per student
- Results include: GPA, total marks, percentage, grade, pass/fail status
- Students view all their results across semesters in a clean dashboard

### 🔔 Real-Time Notifications
- WebSocket-powered live notifications (no page refresh needed)
- Students get instantly notified when payments are approved/rejected
- Staff get instantly notified on new payment or bonafide requests
- Notification center with read/unread state management

### 👤 Profile Management
- Full profile editing for all users (name, phone, address)
- Profile photo upload support
- Department assignment

### 🛡️ Admin Panel
- Manage all users (create, activate/deactivate)
- Manage departments, semesters, and fee structures
- Configure document types with custom templates
- System-wide audit log viewer
- Dashboard analytics (total students, payments, requests)

### 🔍 Search
- Global search across students, staff, and payments

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| **Frontend Build** | Vite | Development server & bundler |
| **Routing** | React Router v6 | SPA client-side routing |
| **State / Data** | TanStack Query (React Query) | Server state, caching, mutations |
| **Real-time** | WebSocket API (native) | Live notifications |
| **HTTP Client** | Axios | API communication |
| **Styling** | Vanilla CSS + CSS Variables | Design system |
| **Icons** | Lucide React | Icon set |
| **Toasts** | React Hot Toast | User feedback notifications |
| **Backend** | FastAPI (Python) | REST API + WebSocket server |
| **ORM** | SQLAlchemy | Database interactions |
| **Database** | PostgreSQL 16 | Primary relational database |
| **Caching** | Redis 7 | Session caching, pub/sub |
| **Auth** | python-jose (JWT) + passlib (bcrypt) | Token auth & password hashing |
| **PDF Generation** | ReportLab + qrcode | Fee receipts & bonafide certificates |
| **Migrations** | Alembic | Database schema versioning |
| **Containerization** | Docker + Docker Compose | Local full-stack orchestration |
| **Frontend Hosting** | Vercel | CDN-deployed SPA |
| **Backend Hosting** | Render | Managed Python web service |
| **Database Hosting** | Neon (Serverless Postgres) | Production database |
| **Cache Hosting** | Upstash (Serverless Redis) | Production Redis |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  USER'S BROWSER                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │        React SPA (Vercel CDN)               │   │
│  │  - Role-based routing (Student/Staff/Admin) │   │
│  │  - TanStack Query for API data              │   │
│  │  - WebSocket for live notifications         │   │
│  └────────────────┬────────────────────────────┘   │
└───────────────────┼─────────────────────────────────┘
                    │ HTTPS / WSS
                    ▼
┌─────────────────────────────────────────────────────┐
│            FastAPI Backend (Render)                 │
│                                                     │
│  ┌───────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  REST API │  │  WebSocket │  │ Static Files  │  │
│  │  Routers  │  │  Manager   │  │  (uploads/)   │  │
│  └─────┬─────┘  └─────┬──────┘  └───────────────┘  │
│        │              │                             │
│  ┌─────▼──────────────▼─────────────────────────┐  │
│  │              Service Layer                   │  │
│  │  PaymentSvc | BonafideSvc | PDFSvc |         │  │
│  │  NotificationSvc | WorkflowAutomationSvc     │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                              │
│  ┌──────────────────▼───────────────────────────┐  │
│  │            SQLAlchemy ORM                    │  │
│  └────────────┬─────────────────┬───────────────┘  │
└───────────────┼─────────────────┼───────────────────┘
                │                 │
                ▼                 ▼
   ┌────────────────┐    ┌─────────────────┐
   │  Neon Postgres │    │  Upstash Redis  │
   │  (Production)  │    │  (Production)   │
   └────────────────┘    └─────────────────┘
```

---

## 👥 User Roles & Modules

### 🎒 Student Portal
| Route | Module | Description |
|-------|--------|-------------|
| `/student` | Dashboard | Quick stats, recent payments, pending requests |
| `/student/payments` | Fee Payments | Upload payment proof, track status, download receipts |
| `/student/results` | Academic Results | View semester results and GPA |
| `/student/documents` | Documents | Request and track official documents |
| `/student/bonafide` | Bonafide | Apply for bonafide certificates |
| `/student/profile` | Profile | Edit personal info and photo |

### 🧑‍💼 Staff Portal
| Route | Module | Description |
|-------|--------|-------------|
| `/staff` | Dashboard | Pending items, activity feed, quick stats |
| `/staff/payments` | Payment Verification | Review, approve/reject student payments |
| `/staff/payment-history` | Payment History | Complete ledger of all processed payments |
| `/staff/documents` | Documents | Review and generate official documents |
| `/staff/bonafides` | Bonafide Requests | Approve/reject bonafide applications |
| `/staff/results` | Results | Publish student semester results |

### 🔧 Admin Panel
| Route | Module | Description |
|-------|--------|-------------|
| `/admin` | Dashboard | System-wide analytics and health |
| `/admin/users` | Users | Create and manage all user accounts |
| `/admin/students` | Students | View and manage student records |
| `/admin/staff` | Staff | View and manage staff records |
| `/admin/departments` | Departments | Create/edit departments |
| `/admin/semesters` | Semesters | Manage academic semesters |
| `/admin/fee-structures` | Fee Structures | Define fee items per semester |
| `/admin/document-types` | Document Types | Configure document templates |

---

## 🚀 Getting Started (Local)

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (recommended)

### Option 1: One-Command Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/sakthisundar-16/CampusOffice-ERP.git
cd CampusOffice-ERP

# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up --build

# In a new terminal, seed the database with sample data
docker-compose exec backend python seed_data.py
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/api/docs

### Option 2: Manual Setup

**Backend:**
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

### Default Login Credentials

After running `seed_data.py`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campus.edu` | `admin123` |
| Staff | `staff@campus.edu` | `staff123` |
| Student | `student@campus.edu` | `student123` |

---

## 🐳 Docker Deployment

The project includes a full `docker-compose.yml` for local development and a `docker-compose.prod.yml` for production-like deployments.

```bash
# Development (with hot reload)
docker-compose up --build

# Production build
docker-compose -f docker-compose.prod.yml up --build
```

All services are networked together via an internal `campus_net` bridge network. Media files are persisted via Docker volumes.

---

## ☁️ Cloud Deployment

The application is deployed using a three-service cloud architecture:

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | https://campus-office-erp.vercel.app |
| Backend | Render | https://campusoffice-erp-backend.onrender.com |
| Database | Neon (Serverless Postgres) | Managed |
| Cache | Upstash (Serverless Redis) | Managed |

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full step-by-step deployment guide.

---

## ⚙️ Environment Variables

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@host/dbname
REDIS_URL=rediss://default:token@host:6379
SECRET_KEY=your-32-character-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=https://your-frontend-domain.vercel.app
UPLOAD_DIR=uploads
PDF_STORAGE_PATH=uploads/documents
DEBUG_MODE=False
```

### Frontend (`.env`)

```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

---

## 📡 API Reference

The API is RESTful and grouped by role. When `DEBUG_MODE=True`, interactive Swagger documentation is available at `/api/docs`.

### Base URL
```
https://campusoffice-erp-backend.onrender.com
```

### Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### Core Endpoint Groups

| Prefix | Description |
|--------|-------------|
| `POST /api/v1/auth/login` | Obtain JWT token |
| `GET/PUT /api/v1/profile/me` | User profile management |
| `GET/POST /api/v1/student/...` | Student-facing APIs |
| `GET/PUT /api/v1/staff/...` | Staff-facing APIs |
| `GET/POST/DELETE /api/v1/admin/...` | Admin management APIs |
| `GET /api/v1/search` | Global search |
| `GET /api/v1/audit` | Audit log access |
| `WS /ws/notifications` | WebSocket real-time channel |
| `GET /verify/{certificate_number}` | Public certificate verification |

---

## 🗃 Database Schema

The system uses 18+ relational tables organized by domain:

```
users                   → Core identity for all roles
├── students            → Student academic profile
├── staff               → Staff employment profile
└── admins              → Admin profile

departments             → Academic departments
semesters               → Academic terms
fee_structures          → Fee items per semester

payment_requests        → Student fee payment submissions
results                 → Published academic results
bonafide_requests       → Bonafide certificate applications

unified_requests        → Unified request tracking engine
request_timeline        → Audit trail per request step
activity_history        → User activity log

notifications           → In-app notification records
audit_logs              → System-wide security audit trail
login_history           → Login event tracking

document_metadata       → Generated certificate metadata
system_health           → Service health check records
```

---

## 📁 Project Structure

```
CampusOffice-ERP/
├── backend/
│   ├── app/
│   │   ├── api/v1/             # Route handlers (auth, student, staff, admin, ...)
│   │   ├── core/               # Config, security, WebSocket manager, Redis client
│   │   ├── models.py           # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic services
│   │   │   ├── payment_service.py
│   │   │   ├── bonafide_service.py
│   │   │   ├── pdf_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── workflow_automation_service.py
│   │   │   └── ...
│   │   ├── dependencies/       # RBAC dependency injectors
│   │   └── main.py             # FastAPI app, middleware, router registration
│   ├── alembic/                # Database migration files
│   ├── seed_data.py            # Initial data seeder
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Certificate Verification
│   │   │   ├── student/        # Dashboard, Payments, Results, Documents, Bonafide, Profile
│   │   │   ├── staff/          # Dashboard, Payments, Documents, Bonafides, Results
│   │   │   └── admin/          # Dashboard, Users, Students, Staff, Departments, ...
│   │   ├── components/         # Shared UI components (Layout, DataTable, ProtectedRoute, ...)
│   │   ├── context/            # WebSocketContext (real-time notifications)
│   │   ├── hooks/              # useAuth hook
│   │   ├── services/           # Axios API client
│   │   ├── types/              # TypeScript type definitions
│   │   └── App.tsx             # Root routing
│   ├── .npmrc                  # Legacy peer deps flag for Vercel
│   └── Dockerfile
│
├── docs/                       # Extended documentation
├── docker-compose.yml          # Local development orchestration
├── docker-compose.prod.yml     # Production-grade compose file
└── README.md
```

---

## 🌐 Live Application

| Link | Description |
|------|-------------|
| [🌍 Live App](https://campus-office-erp.vercel.app) | Production deployment |
| [📦 GitHub Repo](https://github.com/sakthisundar-16/CampusOffice-ERP) | Source code |

---

<div align="center">
  <sub>Built with ❤️ for academic institutions. Deployed and battle-tested in production.</sub>
</div>
