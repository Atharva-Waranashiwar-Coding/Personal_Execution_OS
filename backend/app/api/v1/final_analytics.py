from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.job_application import JobApplication
from app.models.life_admin_item import LifeAdminItem
from app.models.plan_brief import PlanBrief
from app.models.plan_item import PlanItem
from app.models.prompt_run_log import PromptRunLog
from app.models.study_session import StudySession
from app.models.task import Task
from app.models.user import User
from app.models.workout_session import WorkoutSession
from app.schemas.final_analytics import FinalAnalyticsResponse

router = APIRouter()


@router.get("/summary", response_model=FinalAnalyticsResponse)
def final_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinalAnalyticsResponse:
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    tasks = db.scalars(select(Task).where(Task.user_id == current_user.id)).all()
    plan_briefs = db.scalars(select(PlanBrief).where(PlanBrief.user_id == current_user.id)).all()
    plan_items = db.scalars(select(PlanItem).where(PlanItem.user_id == current_user.id)).all()
    study_sessions = db.scalars(select(StudySession).where(StudySession.user_id == current_user.id)).all()
    job_apps = db.scalars(select(JobApplication).where(JobApplication.user_id == current_user.id)).all()
    life_items = db.scalars(select(LifeAdminItem).where(LifeAdminItem.user_id == current_user.id)).all()
    workouts = db.scalars(select(WorkoutSession).where(WorkoutSession.user_id == current_user.id)).all()
    prompt_logs = db.scalars(
        select(PromptRunLog).where(
            (PromptRunLog.user_id == current_user.id) | (PromptRunLog.user_id.is_(None))
        )
    ).all()

    return FinalAnalyticsResponse(
        total_tasks=len(tasks),
        completed_tasks=sum(1 for task in tasks if task.status == "completed"),
        overdue_tasks=sum(1 for task in tasks if task.status != "completed" and task.due_at and task.due_at < now),
        generated_plans=len(plan_briefs),
        total_plan_items=len(plan_items),
        completed_plan_items=sum(1 for item in plan_items if item.status == "completed"),
        study_sessions_completed=sum(1 for session in study_sessions if session.status == "completed"),
        job_active_applications=sum(1 for app in job_apps if app.status == "active"),
        life_admin_urgent_items=sum(
            1 for item in life_items
            if item.status == "pending" and item.due_at and item.due_at <= now + timedelta(days=3)
        ),
        health_weekly_workouts_completed=sum(
            1 for workout in workouts
            if workout.status == "completed" and workout.updated_at >= week_start
        ),
        prompt_runs=len(prompt_logs),
        total_estimated_llm_cost=round(sum(log.estimated_cost for log in prompt_logs), 6),
    )