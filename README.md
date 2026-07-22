# Face ID MVP — Backend Foundation

Real-time face recognition pipeline: webcam → detection → embedding → FAISS search → Postgres lookup.
This stage sets up the **foundation**: config, database layer, and a FastAPI app that boots and talks to Postgres.
Next stages add the ML pipeline (`core/`) and the enroll/recognize/stream endpoints (`api/`).

## Run it

### 1. Start Postgres (Docker)
```bash
docker compose up -d postgres
```

### 2. Set up the backend locally (recommended while iterating)
```bash
cd backend
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the API
```bash
uvicorn main:app --reload --port 8000
```

### 4. Confirm it's alive
```bash
curl http://localhost:8000/health
```
Expected:
```json
{"status": "ok", "env": "development", "database": "ok"}
```

If `database` shows an error, check that Postgres is running (`docker compose ps`) and that
`DATABASE_URL` in `.env` matches the credentials in `docker-compose.yml`.

## What exists so far

| Piece | File | Status |
|---|---|---|
| Config | `config.py` | ✅ |
| DB engine/session | `db/database.py` | ✅ |
| ORM models (`Person`, `RecognitionLog`) | `db/models.py` | ✅ |
| CRUD helpers | `db/crud.py` | ✅ |
| FastAPI app + health check | `main.py` | ✅ |
| Face detector/embedder | `core/` | ⏳ next |
| FAISS index manager | `faiss_index/` | ⏳ next |
| Enroll / Recognize / Stream endpoints | `api/` | ⏳ next |
| React dashboard | `frontend/` | ⏳ later |

## Full architecture

```
Camera → Face Detection → Face Alignment → Face Embedding (512-d) → FAISS Search
                                                                          │
                                                              ┌───────────┴───────────┐
                                                              ▼                       ▼
                                                     Candidate Matches       Similarity Scores
                                                              │
                                                              ▼
                                                     Best Match Selected
                                                              │
                                                              ▼
                                                  faiss_position → PostgreSQL
                                                              │
                                                              ▼
                                                       Person Record
```
