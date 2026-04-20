from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.plan import Plan
from app.models.task import Task
from app.models.user import User
from app.schemas.plan import PlanResponse
from app.schemas.task import TaskResponse

router = APIRouter()


@router.get("/today")
def get_today_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    end_of_day = start_of_day + timedelta(days=1)

    tasks = db.scalars(
        select(Task).where(
            Task.user_id == current_user.id,
            or_(
                and_(Task.scheduled_for >= start_of_day, Task.scheduled_for < end_of_day),
                and_(Task.due_at >= start_of_day, Task.due_at < end_of_day),
            ),
        ).order_by(Task.scheduled_for.asc(), Task.due_at.asc())
    ).all()

    plans = db.scalars(
        select(Plan).where(
            Plan.user_id == current_user.id,
            Plan.start_at >= start_of_day,
            Plan.start_at < end_of_day,
        ).order_by(Plan.start_at.asc())
    ).all()

    return {
        "tasks": [TaskResponse.model_validate(task) for task in tasks],
        "plans": [PlanResponse.model_validate(plan) for plan in plans],
    }


@router.get("/weekly")
def get_weekly_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    end_of_week = start_of_day + timedelta(days=7)

    tasks = db.scalars(
        select(Task).where(
            Task.user_id == current_user.id,
            or_(
                and_(Task.scheduled_for >= start_of_day, Task.scheduled_for < end_of_week),
                and_(Task.due_at >= start_of_day, Task.due_at < end_of_week),
            ),
        ).order_by(Task.scheduled_for.asc(), Task.due_at.asc())
    ).all()

    plans = db.scalars(
        select(Plan).where(
            Plan.user_id == current_user.id,
            Plan.start_at >= start_of_day,
            Plan.start_at < end_of_week,
        ).order_by(Plan.start_at.asc())
    ).all()

    return {
        "tasks": [TaskResponse.model_validate(task) for task in tasks],
        "plans": [PlanResponse.model_validate(plan) for plan in plans],
    }