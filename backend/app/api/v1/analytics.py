from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.plan import Plan
from app.models.task import Task
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    tasks = db.scalars(select(Task).where(Task.user_id == current_user.id)).all()
    plans = db.scalars(select(Plan).where(Plan.user_id == current_user.id)).all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.status == "completed")

    completion_rate = 0.0
    if total_tasks > 0:
        completion_rate = round((completed_tasks / total_tasks) * 100, 2)

    now = datetime.utcnow()
    overdue_count = sum(
        1 for task in tasks
        if task.status != "completed" and task.due_at is not None and task.due_at < now
    )

    total_plans = len(plans)
    adhered_plans = sum(1 for plan in plans if plan.adherence_status == "completed")

    plan_adherence_rate = 0.0
    if total_plans > 0:
        plan_adherence_rate = round((adhered_plans / total_plans) * 100, 2)

    return AnalyticsSummaryResponse(
        completion_rate=completion_rate,
        overdue_count=overdue_count,
        plan_adherence_rate=plan_adherence_rate,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
    )