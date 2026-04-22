# Personal Execution OS

## Overview
Personal Execution OS is a full-stack multi-agent productivity system that transforms goals, tasks, and constraints into actionable daily execution plans.

The system evolves in phases:
- Phase 0: Foundation
- Phase 1: Core Platform
- Phase 2: Orchestrator (current)

---

## Tech Stack

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy + Alembic
- Redis
- Celery

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS

### Infrastructure
- Docker Compose

---

## Phase 0: Foundation

### What was built
- Project structure (backend, frontend, infra)
- Dockerized PostgreSQL + Redis
- FastAPI backend with modular architecture
- SQLAlchemy models and Alembic migrations
- JWT Authentication (register + login)
- Celery worker setup
- Basic dashboard shell (Next.js)
- Environment-based configuration
- Logging + health endpoint

### Run commands

#### Start infrastructure
```bash
docker compose -f infra/docker-compose.yml up -d
```

#### Run backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

#### Run Celery worker
```bash
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app:celery_app worker -l info
```

#### Run frontend
```bash
cd frontend
npm run dev
```

---

## Phase 1: Core Platform

### Features implemented
- Goals CRUD
- Tasks CRUD (with priority, scheduling, completion tracking)
- Recurring task generation
- Plans (manual time blocks)
- Today view
- Weekly view
- Reminder system (Celery-based)
- Notification history
- Approval queue infrastructure
- Analytics (completion rate, overdue tasks, plan adherence)

---

## Phase 2: Orchestrator

### Objective
Introduce a multi-agent orchestration layer that:
- understands user context
- generates candidate actions
- prioritizes them
- stores plans
- collects feedback

---

### Core Concepts

#### AgentInput
Standardized input containing:
- incomplete tasks
- deadlines
- calendar placeholders
- constraint signals

#### AgentOutput
Each agent returns:
- summary
- candidate items

---

### Persistence Layer

#### PlanBrief
Stores:
- generated summary
- context snapshot
- planning notes

#### PlanItem
Stores:
- recommended action
- score breakdown
- rank
- reasoning

#### PlanFeedback
Stores:
- user feedback
- feedback type (useful, ignored, unrealistic, completed)

---

### Orchestrator Flow

1. Assemble context
2. Run all agents
3. Collect candidates
4. Score and rank
5. Resolve conflicts
6. Persist brief + items
7. Return plan

---

### API Endpoints

POST /api/v1/orchestrator/generate  
GET /api/v1/orchestrator/briefs  
GET /api/v1/orchestrator/briefs/{brief_id}  
POST /api/v1/orchestrator/items/{plan_item_id}/feedback  

---

## Frontend Updates

- Generate Plan button
- Latest plan display
- Feedback actions
- Analytics updates

---

## Current Capabilities

- Task + Goal management
- Scheduling + recurrence
- Notifications
- Approval workflows
- Analytics
- Multi-agent planning engine
- Feedback loop

---

## Next Phase

- LLM-powered agents
- smarter scheduling
- integrations (calendar/email)
- adaptive learning

---

## Author

Atharva Waranashiwar