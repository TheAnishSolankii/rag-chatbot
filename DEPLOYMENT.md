# 🚀 Deployment Guide

## Option 1 — Railway (easiest, free tier available)

Railway auto-detects the `docker-compose.yml` and deploys everything.

### Steps

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create a new project
railway init

# 4. Set environment variables (Railway dashboard or CLI)
railway variables set OPENAI_API_KEY=sk-...
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set ENVIRONMENT=production
railway variables set DEBUG=false

# 5. Deploy
railway up
```

Railway gives you a public URL automatically.
Set `ALLOWED_ORIGINS` to your Railway URL in the dashboard.

---

## Option 2 — Render (free tier, easy)

### Backend (Web Service)

1. Go to render.com → New → Web Service
2. Connect your GitHub repo
3. Configure:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Add all vars from `.env.example`
4. Add a **Persistent Disk** (for FAISS index):
   - Mount path: `/app/data`
   - Set `FAISS_INDEX_PATH=/app/data/faiss_index`
   - Set `UPLOAD_DIR=/app/data/uploads`

### Frontend (Static Site)

1. New → Static Site
2. Connect same GitHub repo
3. Configure:
   - **Root directory:** `frontend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
   - **Environment variable:** `VITE_API_URL=https://your-backend.onrender.com/api`

### Update CORS

In backend env vars, set:
```
ALLOWED_ORIGINS=["https://your-frontend.onrender.com"]
```

---

## Option 3 — AWS EC2 (full control)

```bash
# 1. Launch Ubuntu 24.04 EC2 instance (t3.small or larger)
# 2. SSH in and install Docker
ssh ubuntu@YOUR_EC2_IP

sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
newgrp docker

# 3. Clone and configure
git clone https://github.com/YOUR_USERNAME/rag-chatbot.git
cd rag-chatbot
cp backend/.env.example backend/.env
nano backend/.env   # set OPENAI_API_KEY and SECRET_KEY

# 4. Start
docker compose up --build -d

# 5. Configure security group to allow port 80 inbound
# (AWS Console → EC2 → Security Groups → Inbound rules → HTTP port 80)
```

### Add HTTPS with Let's Encrypt (Nginx + Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Create /etc/nginx/sites-available/ragchatbot
sudo nano /etc/nginx/sites-available/ragchatbot
```

```nginx
server {
    server_name your-domain.com;
    location / { proxy_pass http://localhost:80; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ragchatbot /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

---

## Option 4 — VPS with Docker (DigitalOcean / Hetzner / Vultr)

```bash
# 1. Create a $6/mo Droplet (Ubuntu 24.04)
# 2. SSH in, then follow the same steps as AWS EC2 above

# Auto-restart on reboot
sudo systemctl enable docker
docker compose up -d --restart unless-stopped
```

---

## Environment Variables Checklist

Before deploying to any platform:

| Variable | Action |
|----------|--------|
| `OPENAI_API_KEY` | Set your real key |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `ENVIRONMENT` | Set to `production` |
| `DEBUG` | Set to `false` |
| `ALLOWED_ORIGINS` | Set to your frontend URL |
| `DEMO_USERS` | Change default passwords |
| `DATABASE_URL` | (optional) point to PostgreSQL |

---

## PostgreSQL (production database)

To replace SQLite with PostgreSQL:

```bash
# Add to your env vars
DATABASE_URL=postgresql+psycopg2://username:password@host:5432/ragdb

# Add to requirements.txt
psycopg2-binary==2.9.10

# Run migrations (creates tables automatically on startup via init_db())
```

Railway and Render both offer managed PostgreSQL add-ons.

---

## Monitoring (optional)

Add to `docker-compose.yml` for basic uptime monitoring:

```yaml
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300   # check for image updates every 5 min
```

For production metrics, add the [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator) package.
