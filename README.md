# CampusOffice ERP

A full-stack, production-ready Campus ERP system for managing student records, fees, certificates, and documents.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Cache / WebSockets | Redis 7 |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |

## Quick Start (Development)

```bash
# 1. Clone the repo
git clone <repo-url>
cd mini-campus-erp

# 2. Start all services
docker-compose up -d --build

# 3. Open the app
open http://localhost:5173
```

## Production Deployment

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions.

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)

## Default Credentials (Development Only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | admin123 |
| Staff | staff@campus.edu | staff123 |
| Student | student@campus.edu | student123 |

> ⚠️ Change all credentials before production deployment.
