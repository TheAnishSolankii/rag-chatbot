# Contributing to RAG Chatbot

Thank you for your interest in contributing! This guide covers how to set up
your development environment, coding conventions, and the pull-request process.

---

## Development Setup

```bash
# One-command setup
bash scripts/setup.sh

# Or manually:
make setup
```

Edit `backend/.env` and add your `OPENAI_API_KEY`, then:

```bash
make dev          # starts backend (:8000) + frontend (:5173) concurrently
```

---

## Project Structure at a Glance

```
backend/app/
  config.py          ← all env vars (edit here before adding new settings)
  main.py            ← FastAPI app + startup/shutdown hooks
  database.py        ← SQLAlchemy models + CRUD (users, audit log)
  auth/              ← JWT creation, validation, routes
  api/               ← document, chat, admin route handlers
  core/              ← PDF processor, FAISS manager, RAG chain
  middleware/        ← rate limiter
  models/schemas.py  ← ALL Pydantic models live here

frontend/src/
  context/           ← React contexts (Auth, Toast)
  hooks/             ← all custom hooks
  services/api.js    ← centralised API client (Axios + SSE)
  components/        ← purely presentational components
  pages/             ← route-level page components
```

---

## Coding Conventions

### Backend (Python)

- **Formatter:** `ruff format` (line length 100)
- **Linter:** `ruff check` — run `make lint-backend` before committing
- **Type hints:** use them on all function signatures
- **Docstrings:** module-level docstrings explaining the file's purpose
- **Imports:** absolute (`from app.config import get_settings`)
- **Error handling:** raise `HTTPException` with descriptive `detail` strings
- **New env vars:** add to `Settings` in `config.py` AND `.env.example`
- **New routes:** add to the appropriate router in `app/api/` and register in `main.py`

```python
# Good
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    vs: VectorStoreManager = Depends(get_vector_store),
) -> DocumentMeta:
    ...

# Avoid
async def upload(file, user, vs):
    ...
```

### Frontend (React / JS)

- **Components:** functional, one per file, PascalCase filename
- **Hooks:** `use` prefix, one concern per hook, lives in `src/hooks/`
- **Styles:** Tailwind utility classes only — no inline styles, no CSS modules
- **State:** local `useState` first, context only when truly global
- **API calls:** always go through `src/services/api.js` — never `fetch` directly except SSE
- **Toast:** use `useToast()` for all user feedback — never `alert()`
- **Errors:** all async functions return `{ success, error }` shape

```jsx
// Good — explicit return shape
const result = await uploadDocument(file, onProgress)
if (result.success) toast.success('Uploaded!')
else toast.error(result.error)

// Avoid — throwing in component code
try { await uploadDocument(file) } catch (e) { alert(e.message) }
```

---

## Adding a New Feature

### Backend route

1. Add Pydantic schema(s) to `app/models/schemas.py`
2. Add route handler to the appropriate file in `app/api/`
3. Register the router in `app/main.py` if it's a new file
4. Add tests to `backend/tests/test_api.py`
5. Run `make test` — all tests must pass

### Frontend page

1. Create `frontend/src/pages/YourPage.jsx`
2. Add any data-fetching logic to a hook in `hooks/`
3. Add the route to `App.jsx`
4. Add the nav link to `components/UI/Sidebar.jsx`

---

## Testing

```bash
# Run all backend tests
make test

# Run with verbose output
make test-v

# Run a single test class
cd backend && .venv/bin/pytest tests/test_api.py::TestDocuments -v
```

When adding a new feature, write tests that cover:
- Happy path (expected input → expected output)
- Validation errors (missing/wrong fields → 422)
- Auth errors (missing/expired token → 401/403)

---

## Pull Request Process

1. **Branch naming:** `feat/short-description`, `fix/short-description`, `docs/short-description`
2. **Commit messages:** follow [Conventional Commits](https://www.conventionalcommits.org/)
   - `feat: add PDF page preview`
   - `fix: prevent duplicate chunk indexing`
   - `docs: update deployment guide`
3. **Before opening a PR:**
   - `make lint` — must pass with 0 errors
   - `make test` — all tests must pass
   - `npm run build` inside `frontend/` — build must succeed
4. **PR description:** explain *what* changed and *why*; link the issue if one exists
5. **Reviewers:** add at least one reviewer before merging to `main`

---

## Environment Variables

Never commit secrets. The `.gitignore` already excludes `.env` files.

To add a new setting:
1. Add the field to `Settings` in `backend/app/config.py`
2. Add a commented example to `backend/.env.example`
3. Document it in the `README.md` configuration table
4. Add it to the GitHub Actions CI env block in `.github/workflows/ci.yml`

---

## Questions?

Open a [GitHub Discussion](../../discussions) for questions,
or file an [Issue](../../issues) for bugs and feature requests.
