# 🤖 RAG Chatbot — Production-Ready AI Document Search

A full-stack **Retrieval-Augmented Generation (RAG)** application that lets you upload PDF documents and chat with them using GPT-4.1 with semantic search, streaming responses, and source citations.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│              React 18 + Tailwind CSS + Vite                  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / SSE
                    ┌────────▼────────┐
                    │   Nginx Gateway  │  :80
                    │  (rate limiting, │
                    │   proxy, gzip)  │
                    └───┬─────────┬───┘
                        │         │
          ┌─────────────▼──┐  ┌───▼──────────────┐
          │  FastAPI Backend│  │  React SPA (Nginx)│
          │   Python 3.12   │  │  Static Assets    │
          │                 │  └──────────────────┘
          │  ┌───────────┐  │
          │  │ LangChain │  │
          │  │ RAG Chain │  │
          │  └─────┬─────┘  │
          │        │        │
          │  ┌─────▼──────┐ │
          │  │  FAISS     │ │  ← persisted to Docker volume
          │  │ Vector DB  │ │
          │  └────────────┘ │
          │                 │
          │  ┌────────────┐ │
          │  │ OpenAI API │ │  ← GPT-4.1 + text-embedding-3-small
          │  └────────────┘ │
          └─────────────────┘
```

### Request flow (chat message)
```
User types message
  → POST /api/chat/stream (JWT-authenticated)
  → FAISS similarity search (top-5 chunks)
  → Context + history assembled
  → GPT-4.1 streams tokens via SSE
  → React renders tokens in real time
  → Citations panel populated after stream
```

---

## 📁 Folder Structure

```
rag-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, lifespan, middleware
│   │   ├── config.py            # Pydantic Settings (env vars)
│   │   ├── auth/
│   │   │   ├── jwt_handler.py   # JWT create/validate, user store
│   │   │   └── routes.py        # /api/auth/* endpoints
│   │   ├── api/
│   │   │   ├── documents.py     # Upload / list / delete PDFs
│   │   │   └── chat.py          # Stream / message / history endpoints
│   │   ├── core/
│   │   │   ├── pdf_processor.py # PyMuPDF extraction + LangChain chunking
│   │   │   ├── vector_store.py  # FAISS manager (add/search/delete/persist)
│   │   │   └── rag_chain.py     # LangChain RAG + ConversationMemory
│   │   ├── middleware/
│   │   │   └── rate_limiter.py  # Sliding-window rate limiter
│   │   └── models/
│   │       └── schemas.py       # Pydantic v2 request/response schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── Chat/
│   │   │   │   ├── ChatMessage.jsx   # Markdown + syntax highlight + cursor
│   │   │   │   ├── ChatInput.jsx     # Auto-resize textarea + send
│   │   │   │   └── SourceCitations.jsx # Expandable citation cards
│   │   │   ├── Documents/
│   │   │   │   ├── FileUploader.jsx  # Drag-and-drop + progress tracking
│   │   │   │   └── DocumentList.jsx  # Cards with delete confirm modal
│   │   │   └── UI/
│   │   │       ├── AppLayout.jsx     # Responsive shell + mobile drawer
│   │   │       └── Sidebar.jsx       # Nav + user info + logout
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # JWT state, login/logout, token refresh
│   │   ├── hooks/
│   │   │   ├── useChat.js        # SSE streaming, message state, session
│   │   │   └── useDocuments.js   # Document CRUD state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   └── DocumentsPage.jsx
│   │   ├── services/
│   │   │   └── api.js            # Axios client + auth interceptors + SSE
│   │   ├── App.jsx               # React Router routes
│   │   ├── main.jsx
│   │   └── index.css             # Tailwind + custom prose styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── nginx.frontend.conf
│
├── nginx/
│   └── nginx.conf              # Gateway: rate-limit, proxy, SSE support
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1 — Clone and configure

```bash
git clone <your-repo>
cd rag-chatbot
```

**Backend env:**
```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set:
```
OPENAI_API_KEY=sk-...
SECRET_KEY=$(openssl rand -hex 32)   # generate a strong secret
```

**Frontend env:**
```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL=/api  ← default is fine for local dev
```

### 2 — Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The API is now at **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs** (only in DEBUG=true mode)

### 3 — Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the Vite dev server proxies `/api` → `localhost:8000`.

### 4 — Login

Default credentials (change in `backend/.env` → `DEMO_USERS`):
| Username | Password |
|----------|----------|
| `admin`  | `admin123` |
| `user`   | `user123` |

---

## 🐳 Docker Deployment

### One-command start

```bash
# 1. Create backend env file
cp backend/.env.example backend/.env
#    → set OPENAI_API_KEY and SECRET_KEY

# 2. Build and launch all services
docker compose up --build -d

# 3. View logs
docker compose logs -f

# 4. Open the app
open http://localhost
```

### Individual service commands

```bash
# Rebuild only the backend after code changes
docker compose up --build -d backend

# Scale backend workers (stateless, but FAISS is in-process — use 1 replica)
docker compose up -d --scale backend=1

# Stop everything
docker compose down

# Stop and remove volumes (DELETES all indexed data)
docker compose down -v
```

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Returns `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | Exchange refresh token for new pair |
| `GET`  | `/auth/me` | Current user info |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/upload` | Upload + index a PDF (`multipart/form-data`) |
| `GET`  | `/documents/` | List all indexed documents |
| `DELETE` | `/documents/{doc_id}` | Delete document and its embeddings |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat/stream` | **SSE streaming** chat response |
| `POST` | `/chat/message` | Non-streaming JSON response |
| `GET`  | `/chat/history/{session_id}` | Conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear conversation |

### System
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + index stats |

---

## 🔧 Configuration Reference

All backend settings live in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | **required** | Your OpenAI API key |
| `SECRET_KEY` | **required** | JWT signing secret (min 32 chars) |
| `OPENAI_CHAT_MODEL` | `gpt-4.1` | Chat completion model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `CHUNK_SIZE` | `1000` | Characters per document chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `MAX_RETRIEVAL_DOCS` | `5` | Top-k chunks retrieved per query |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max PDF upload size |
| `RATE_LIMIT_PER_MINUTE` | `30` | API requests per minute per IP |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT access token TTL (24h) |
| `DEMO_USERS` | `admin:admin123,...` | Comma-separated `user:pass` pairs |

---

## 🚀 Production Hardening Checklist

- [ ] **Replace demo auth** with PostgreSQL + `passlib` hashed passwords + proper user management
- [ ] **HTTPS** — add SSL certificates to Nginx (Let's Encrypt via Certbot)
- [ ] **Secrets management** — use Docker Secrets or a vault (not plain `.env` files)
- [ ] **Distributed memory** — replace in-process `ConversationMemory` with Redis for multi-replica deployments
- [ ] **Object storage** — move uploaded PDFs to S3/GCS instead of a local volume
- [ ] **Monitoring** — add Prometheus metrics endpoint + Grafana dashboard
- [ ] **Logging** — ship structured JSON logs to ELK or Datadog
- [ ] **Backups** — schedule regular snapshots of the FAISS volume

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS 3, Vite, React Router v6 |
| Markdown | react-markdown, remark-gfm, react-syntax-highlighter |
| Backend | FastAPI 0.115, Python 3.12, Uvicorn |
| LLM | OpenAI GPT-4.1 via LangChain |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Vector DB | FAISS CPU (persisted to disk) |
| PDF parsing | PyMuPDF (fitz) |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Auth | JWT (PyJWT) + Bearer token scheme |
| Streaming | Server-Sent Events (SSE) via sse-starlette |
| Rate limiting | Sliding-window middleware (in-process) |
| Containerisation | Docker + Docker Compose + Nginx |

---

## 📄 License

MIT — see `LICENSE` for details.
