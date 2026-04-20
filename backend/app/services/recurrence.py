from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task


def create_next_recurring_task(task: Task, db: Session) -> Task | None:
    if not task.is_recurring or not task.recurrence_rule or not task.scheduled_for:
        return None

    if task.recurrence_rule == "daily":
        next_scheduled_for = task.scheduled_for + timedelta(days=1)
    elif task.recurrence_rule == "weekly":
        next_scheduled_for = task.scheduled_for + timedelta(weeks=1)
    else:
        return None

    existing = db.scalar(
        select(Task).where(
            Task.user_id == task.user_id,
            Task.parent_task_id == task.id,
            Task.scheduled_for == next_scheduled_for,
        )
    )
    if existing:
        return None

    next_due_at = None
    if task.due_at and task.scheduled_for:
        delta = task.due_at - task.scheduled_for
        next_due_at = next_scheduled_for + delta

    new_task = Task(
        user_id=task.user_id,
        goal_id=task.goal_id,
        title=task.title,
        description=task.description,
        status="pending",
        priority=task.priority,
        due_at=next_due_at,
        scheduled_for=next_scheduled_for,
        estimated_minutes=task.estimated_minutes,
        is_recurring=False,
        recurrence_rule=None,
        parent_task_id=task.id,
        reminder_offset_minutes=task.reminder_offset_minutes,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task