from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.task import Task
from app.models.user import User
from app.schemas.orchestrator import AgentInput, ConstraintSignal


def assemble_agent_input(db: Session, user: User) -> AgentInput:
    now = datetime.utcnow()
    next_7_days = now + timedelta(days=7)

    incomplete_tasks = db.scalars(
        select(Task).where(
            Task.user_id == user.id,
            Task.status != "completed",
        ).order_by(Task.due_at.asc(), Task.scheduled_for.asc())
    ).all()

    deadlines = [
        {
            "task_id": task.id,
            "title": task.title,
            "due_at": task.due_at.isoformat() if task.due_at else None,
            "priority": task.priority,
        }
        for task in incomplete_tasks
        if task.due_at is not None and task.due_at <= next_7_days
    ]

    calendar_placeholders = db.scalars(
        select(Plan).where(
            Plan.user_id == user.id,
            Plan.start_at.is_not(None),
            Plan.end_at.is_not(None),
            Plan.start_at >= now - timedelta(days=1),
            Plan.start_at <= next_7_days,
        ).order_by(Plan.start_at.asc())
    ).all()

    placeholder_payload = [
        {
            "plan_id": plan.id,
            "title": plan.title,
            "start_at": plan.start_at.isoformat() if plan.start_at else None,
            "end_at": plan.end_at.isoformat() if plan.end_at else None,
            "status": plan.status,
        }
        for plan in calendar_placeholders
    ]

    constraint_signals: list[ConstraintSignal] = []

    if len(incomplete_tasks) >= 10:
        constraint_signals.append(
            ConstraintSignal(
                signal_type="backlog_pressure",
                value="high",
                source="task_count",
            )
        )

    overdue_count = sum(
        1 for task in incomplete_tasks
        if task.due_at is not None and task.due_at < now
    )
    if overdue_count > 0:
        constraint_signals.append(
            ConstraintSignal(
                signal_type="overdue_pressure",
                value=str(overdue_count),
                source="task_deadlines",
            )
        )

    return AgentInput(
        user_id=user.id,
        now=now,
        timezone=user.timezone,
        incomplete_tasks=[
            {
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "due_at": task.due_at.isoformat() if task.due_at else None,
                "scheduled_for": task.scheduled_for.isoformat() if task.scheduled_for else None,
                "estimated_minutes": task.estimated_minutes,
                "goal_id": task.goal_id,
            }
            for task in incomplete_tasks
        ],
        deadlines=deadlines,
        calendar_placeholders=placeholder_payload,
        constraints=constraint_signals,
    )