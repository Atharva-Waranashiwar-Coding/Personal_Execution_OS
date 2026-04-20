# Personal Execution OS

## Phase 0
Foundation setup with:
- FastAPI backend
- Next.js frontend
- PostgreSQL
- Redis
- Celery
- SQLAlchemy
- Alembic
- JWT auth
- Docker Compose

## Run infra
```bash
docker compose -f infra/docker-compose.yml up -d
```

## Run backend 
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Run worker
```bash
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app:celery_app worker -l info
```

## Run frontend
```bash
cd frontend
npm run dev
```

