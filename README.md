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

- Frontend: React + Vite
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

## Run it locally

```bash
docker compose up -d postgres
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Notes

This is a demo MVP, not a production biometric system. It is good for learning, prototyping, and small-scale face matching, but it is not built for huge-scale identity deployment yet.

