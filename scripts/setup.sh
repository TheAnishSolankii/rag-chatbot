#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  RAG Chatbot — One-command local setup script
#  Usage: bash scripts/setup.sh
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

CYAN='\033[36m'; GREEN='\033[32m'; RED='\033[31m'; RESET='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${CYAN}▶ $*${RESET}"; }
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}" >&2; exit 1; }
hr()   { echo -e "${CYAN}─────────────────────────────────────────────${RESET}"; }

hr
echo -e "${BOLD}  RAG Chatbot — Local Setup${RESET}"
hr

# ── Prerequisites check ───────────────────────────────────────────────────────
log "Checking prerequisites…"
command -v python3 >/dev/null 2>&1 || fail "Python 3 not found. Install from python.org"
command -v node    >/dev/null 2>&1 || fail "Node.js not found. Install from nodejs.org"
command -v npm     >/dev/null 2>&1 || fail "npm not found. Install Node.js from nodejs.org"
command -v git     >/dev/null 2>&1 || fail "Git not found. Install from git-scm.com"

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1))")
log "Python $PYTHON_VER | Node $NODE_VER"

# ── Backend ───────────────────────────────────────────────────────────────────
hr
log "Setting up Python backend…"
cd backend

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    ok "Created virtual environment"
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
pip install pytest pytest-asyncio httpx ruff --quiet
ok "Installed Python dependencies"

if [ ! -f ".env" ]; then
    cp .env.example .env
    ok "Created backend/.env"
    echo ""
    echo -e "${RED}  ⚠️  IMPORTANT: Edit backend/.env and set:${RESET}"
    echo -e "${RED}     OPENAI_API_KEY=your-key-here${RESET}"

    # Auto-generate SECRET_KEY
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i.bak "s|SECRET_KEY=change-me-use-openssl-rand-hex-32|SECRET_KEY=$SECRET|g" .env
    rm -f .env.bak
    ok "Generated SECRET_KEY automatically"
    echo ""
else
    ok "backend/.env already exists"
fi

mkdir -p data/faiss_index data/uploads
ok "Created data directories"

cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
hr
log "Setting up React frontend…"
cd frontend

if [ ! -f ".env" ]; then
    cp .env.example .env
    ok "Created frontend/.env"
fi

npm install --prefer-offline --silent
ok "Installed Node dependencies"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
hr
ok "Setup complete!"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "  1. Edit ${CYAN}backend/.env${RESET} and add your OPENAI_API_KEY"
echo -e "  2. Run ${CYAN}make dev${RESET}  (or  make dev-backend  +  make dev-frontend  in separate terminals)"
echo -e "  3. Open ${CYAN}http://localhost:5173${RESET}  — login: admin / admin123"
echo ""
