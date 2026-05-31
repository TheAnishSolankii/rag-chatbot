# ════════════════════════════════════════════════════════════════════════════
#  RAG Chatbot — Makefile
#  Run `make help` to see all available commands.
# ════════════════════════════════════════════════════════════════════════════

.DEFAULT_GOAL := help
.PHONY: help setup setup-backend setup-frontend dev dev-backend dev-frontend \
        test test-backend lint lint-backend lint-frontend \
        docker-up docker-down docker-rebuild docker-logs docker-clean \
        generate-secret clean

# ── Colours ───────────────────────────────────────────────────────────────────
CYAN   := \033[36m
RESET  := \033[0m
BOLD   := \033[1m

# ── Paths ─────────────────────────────────────────────────────────────────────
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
VENV         := $(BACKEND_DIR)/.venv
PYTHON       := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip

# ══════════════════════════════════════════════════════════════════════════════
#  Help
# ══════════════════════════════════════════════════════════════════════════════
help:
	@echo ""
	@echo "$(BOLD)RAG Chatbot — available commands$(RESET)"
	@echo ""
	@echo "$(CYAN)Setup$(RESET)"
	@echo "  make setup           Full first-time setup (backend + frontend)"
	@echo "  make setup-backend   Python venv + pip install"
	@echo "  make setup-frontend  npm install"
	@echo "  make generate-secret Print a new SECRET_KEY value"
	@echo ""
	@echo "$(CYAN)Development$(RESET)"
	@echo "  make dev             Start backend AND frontend concurrently"
	@echo "  make dev-backend     Start FastAPI with hot-reload"
	@echo "  make dev-frontend    Start Vite dev server"
	@echo ""
	@echo "$(CYAN)Testing$(RESET)"
	@echo "  make test            Run all backend tests"
	@echo "  make test-v          Run backend tests (verbose)"
	@echo ""
	@echo "$(CYAN)Linting$(RESET)"
	@echo "  make lint            Lint backend + frontend"
	@echo "  make lint-backend    Ruff lint + format check"
	@echo "  make lint-frontend   ESLint"
	@echo ""
	@echo "$(CYAN)Docker$(RESET)"
	@echo "  make docker-up       Build and start all containers"
	@echo "  make docker-down     Stop all containers"
	@echo "  make docker-rebuild  Force rebuild all images"
	@echo "  make docker-logs     Tail logs from all containers"
	@echo "  make docker-clean    Remove containers, images, and volumes"
	@echo ""
	@echo "$(CYAN)Utilities$(RESET)"
	@echo "  make clean           Remove build artefacts and caches"
	@echo ""

# ══════════════════════════════════════════════════════════════════════════════
#  Setup
# ══════════════════════════════════════════════════════════════════════════════
setup: setup-backend setup-frontend
	@echo "$(CYAN)✅ Setup complete. Now edit backend/.env and run 'make dev'$(RESET)"

setup-backend:
	@echo "$(CYAN)Setting up Python virtual environment…$(RESET)"
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt
	$(PIP) install pytest pytest-asyncio httpx ruff
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env; \
		echo "$(CYAN)Created backend/.env from .env.example$(RESET)"; \
	fi
	@echo "$(CYAN)✅ Backend ready$(RESET)"

setup-frontend:
	@echo "$(CYAN)Installing Node dependencies…$(RESET)"
	cd $(FRONTEND_DIR) && npm install
	@if [ ! -f $(FRONTEND_DIR)/.env ]; then \
		cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env; \
		echo "$(CYAN)Created frontend/.env from .env.example$(RESET)"; \
	fi
	@echo "$(CYAN)✅ Frontend ready$(RESET)"

generate-secret:
	@python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# ══════════════════════════════════════════════════════════════════════════════
#  Development
# ══════════════════════════════════════════════════════════════════════════════
dev: 
	@echo "$(CYAN)Starting backend and frontend…$(RESET)"
	@trap 'kill 0' SIGINT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend:
	@echo "$(CYAN)Starting FastAPI on :8000$(RESET)"
	cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn app.main:app \
		--reload --port 8000 --log-level info

dev-frontend:
	@echo "$(CYAN)Starting Vite on :5173$(RESET)"
	cd $(FRONTEND_DIR) && npm run dev

# ══════════════════════════════════════════════════════════════════════════════
#  Testing
# ══════════════════════════════════════════════════════════════════════════════
test:
	@echo "$(CYAN)Running backend tests…$(RESET)"
	cd $(BACKEND_DIR) && $(PYTHON) -m pytest tests/ --tb=short -q

test-v:
	cd $(BACKEND_DIR) && $(PYTHON) -m pytest tests/ -v

# ══════════════════════════════════════════════════════════════════════════════
#  Linting
# ══════════════════════════════════════════════════════════════════════════════
lint: lint-backend lint-frontend

lint-backend:
	@echo "$(CYAN)Linting backend…$(RESET)"
	cd $(BACKEND_DIR) && $(PYTHON) -m ruff check app/ && \
		$(PYTHON) -m ruff format app/ --check

lint-frontend:
	@echo "$(CYAN)Linting frontend…$(RESET)"
	cd $(FRONTEND_DIR) && npm run lint 2>/dev/null || echo "No lint script found"

# ══════════════════════════════════════════════════════════════════════════════
#  Docker
# ══════════════════════════════════════════════════════════════════════════════
docker-up:
	@echo "$(CYAN)Building and starting Docker services…$(RESET)"
	docker compose up --build -d
	@echo "$(CYAN)✅ App running at http://localhost$(RESET)"

docker-down:
	docker compose down

docker-rebuild:
	@echo "$(CYAN)Force-rebuilding all images…$(RESET)"
	docker compose down
	docker compose build --no-cache
	docker compose up -d

docker-logs:
	docker compose logs -f

docker-clean:
	@echo "$(CYAN)Removing all containers, images, and volumes…$(RESET)"
	docker compose down -v --rmi local
	@echo "$(CYAN)✅ Cleaned$(RESET)"

# ══════════════════════════════════════════════════════════════════════════════
#  Utilities
# ══════════════════════════════════════════════════════════════════════════════
clean:
	@echo "$(CYAN)Cleaning build artefacts…$(RESET)"
	find . -type d -name __pycache__ | xargs rm -rf
	find . -type d -name .pytest_cache | xargs rm -rf
	find . -type d -name .ruff_cache | xargs rm -rf
	find . -name "*.pyc" -delete
	rm -rf $(FRONTEND_DIR)/dist
	@echo "$(CYAN)✅ Clean$(RESET)"
