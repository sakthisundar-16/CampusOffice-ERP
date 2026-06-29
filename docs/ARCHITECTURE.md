# Architecture — CampusOffice ERP

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network (campus_net)           │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │   Frontend   │    │   Backend    │                   │
│  │  Nginx:80    │───▶│  FastAPI:8000│                   │
│  │  React SPA   │    │  Uvicorn     │                   │
│  └──────────────┘    └──────┬───────┘                   │
│         │                   │                           │
│    Port 5173                ├──────────────────────┐    │
│    (exposed)         ┌──────▼──────┐  ┌────────────▼─┐ │
│                      │  PostgreSQL  │  │    Redis     │ │
│                      │    :5432    │  │    :6379     │ │
│                      └─────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components

### Frontend (Nginx + React)
- Built with Vite into a static bundle
- Served by Nginx on port 80 (internal) / 5173 (dev host)
- Nginx acts as reverse proxy for `/api/` and `/ws/` to backend
- Rate limits login to 5 req/min
- Gzip compression for all text assets
- Immutable cache headers for JS/CSS bundles

### Backend (FastAPI + Uvicorn)
- Python 3.12 + FastAPI async framework
- Uvicorn ASGI server (no `--reload` in production)
- JWT authentication with bcrypt password hashing
- WebSocket server for real-time notifications
- Structured JSON logging with rotating files

### PostgreSQL
- Primary relational datastore
- Connection pool: size=20, overflow=40, pre_ping=True
- Automatic table creation via SQLAlchemy `create_all`

### Redis
- Session caching and real-time pub/sub for WebSocket notifications
- Graceful degradation: all cache ops fail silently if Redis is down
- Application continues functioning without Redis

## Request Flow

```
Browser
  │
  ▼
Nginx (:5173 dev / :80 prod)
  │
  ├── /api/* ──────────▶ FastAPI (:8000)
  │                          │
  │                          ├── PostgreSQL (data)
  │                          └── Redis (cache/pub-sub)
  │
  ├── /ws/* ───────────▶ FastAPI WebSocket (:8000)
  │
  ├── /uploads/* ──────▶ Static file serve (Nginx)
  │
  └── /* ──────────────▶ React SPA (index.html)
```

## Data Flow — Document Request

```
Student submits request
  │
  ▼
FastAPI validates + creates DB record
  │
  ▼
Redis pub/sub notifies connected Staff via WebSocket
  │
  ▼
Staff reviews + approves request
  │
  ▼
PDF generated (reportlab) → saved to /uploads/documents/
  │
  ▼
Student receives WebSocket notification
  │
  ▼
Student downloads PDF via /uploads/ static route
```

## Environment Tiers

| Setting | Development | Production |
|---|---|---|
| `DEBUG_MODE` | True | False |
| API Docs | Enabled | Disabled |
| CORS | Relaxed | Strict |
| DB Host | localhost | postgres (Docker service) |
| Redis Host | localhost | redis (Docker service) |
| Upload Dir | ./uploads | /media_data/uploads |
