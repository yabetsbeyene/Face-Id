# Face ID MVP

A simple full-stack face recognition demo built with React, FastAPI, PostgreSQL, and FAISS.

## What it does

- enrolls a person from an uploaded image
- recognizes a person from a photo upload
- streams webcam frames for live recognition
- stores person metadata in PostgreSQL
- stores face embeddings in FAISS
- logs recognition outcomes

## Main stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Uvicorn
- Database: PostgreSQL + SQLAlchemy
- AI/CV: OpenCV + InsightFace + ONNX Runtime + NumPy
- Vector search: FAISS
- Container setup: Docker Compose

## Main API endpoints

- `GET /health`
- `POST /enroll`
- `POST /recognize/image`
- `WebSocket /ws/recognize`

## Run the full stack locally (Windows PowerShell)

From the project root, start PostgreSQL:

```powershell
docker compose up -d postgres
docker compose ps
```

Open a second PowerShell terminal in the project root and start the backend:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, run this once in that terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Confirm the backend is ready at `http://127.0.0.1:8000/health`.

Open a third PowerShell terminal in the project root and start the TypeScript frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. On the first visit, click **Arm alert
sound** and allow camera access when prompted.

TypeScript is compiled automatically by Vite while developing. To check types
or make a production build manually, run `npm.cmd run typecheck` or
`npm.cmd run build` from `frontend`.

To stop the frontend/backend, press `Ctrl+C` in their terminals. Stop the
database with `docker compose down` from the project root.

## Configure match-alert email

Edit `backend/.env` and set the SMTP values. For Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=your-account@gmail.com
SMTP_USE_TLS=true
DEFAULT_ALERT_EMAIL=officer@department.org
EMAIL_ALERT_COOLDOWN_SECONDS=300
```

Gmail requires two-step verification and an App Password; do not put your
normal Google password in this file. Restart the backend after changing
`.env`. New enrollment records require an officer alert email, and existing
records can be given one from the Directory management form. The default
address is used as a fallback. Live detections are limited to one email per
matched person per cooldown period.
 
