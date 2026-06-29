# Deployment Guide — CampusOffice ERP

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 2 GB RAM minimum (4 GB recommended)
- 10 GB disk space

---

## Development Deployment

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd mini-campus-erp
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your local settings.

### 2. Start services

```bash
docker-compose up -d --build
```

### 3. Access

- **App**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs (debug mode only)

---

## Production Deployment

### 1. Configure environment

```bash
cp backend/.env.example backend/.env.production
```

Edit `backend/.env.production`:

```env
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres/erpdb
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(64))">
FRONTEND_URL=https://your-domain.com
UPLOAD_DIR=/media_data/uploads
PDF_STORAGE_PATH=/media_data/uploads/documents
DEBUG_MODE=False
```

### 2. Configure Nginx for your domain

Edit `frontend/nginx.conf` — replace `localhost` with your domain and uncomment the HTTPS block.

### 3. Deploy

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 4. Verify

```bash
curl http://your-domain.com/health
curl http://your-domain.com/health/database
curl http://your-domain.com/health/redis
curl http://your-domain.com/health/storage
```

---

## Database Backup & Restore

```bash
# Backup
DB_HOST=localhost DB_USER=postgres DB_PASSWORD=yourpassword DB_NAME=erpdb ./backup.sh backup

# Restore
DB_HOST=localhost DB_USER=postgres DB_PASSWORD=yourpassword DB_NAME=erpdb ./backup.sh restore backups/erpdb_2024-01-01_120000.sql.gz
```

---

## Deploy on Render / Railway

1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables from `backend/.env.example`
4. Deploy backend as a Web Service with:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Deploy frontend as a Static Site with:
   - Build command: `npm ci --legacy-peer-deps && npm run build`
   - Publish directory: `dist`
6. Add a Postgres and Redis add-on from the platform dashboard

---

## VPS Deployment (Ubuntu)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and deploy
git clone <repo-url>
cd mini-campus-erp
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Enable firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## SSL / HTTPS

Use Certbot to obtain a free Let's Encrypt certificate:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Certs will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

Then uncomment the HTTPS server block in `frontend/nginx.conf` and mount the certs into the frontend container.
