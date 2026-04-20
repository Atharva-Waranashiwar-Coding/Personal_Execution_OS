from datetime import datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.task import Task
from app.services.notifications import create_notification
from app.services.recurrence import create_next_recurring_task
from app.workers.celery_app import celery_app


@celery_app.task
def ping() -> str:
    return "pong"


@celery_app.task
def generate_recurring_tasks() -> int:
    db = SessionLocal()
    created_count = 0
    try:
        recurring_tasks = db.scalars(
            select(Task).where(
                Task.is_recurring == True,  # noqa: E712
                Task.status.in_(["pending", "completed"]),
            )
        ).all()

        for task in recurring_tasks:
            new_task = create_next_recurring_task(task, db)
            if new_task:
                created_count += 1

        return created_count
    finally:
        db.close()


@celery_app.task
def send_due_task_reminders() -> int:
    db = SessionLocal()
    sent_count = 0
    try:
        now = datetime.utcnow()
        lookback = now - timedelta(minutes=1)
        lookahead = now + timedelta(minutes=1)

        tasks = db.scalars(
            select(Task).where(
                Task.status == "pending",
                Task.scheduled_for.is_not(None),
                Task.reminder_offset_minutes.is_not(None),
            )
        ).all()

        for task in tasks:
            reminder_time = task.scheduled_for - timedelta(minutes=task.reminder_offset_minutes)
            if lookback <= reminder_time <= lookahead:
                create_notification(
                    db,
                    user_id=task.user_id,
                    notification_type="task_reminder",
                    title=f"Reminder: {task.title}",
                    body=task.description,
                    reference_type="task",
                    reference_id=task.id,
                )
                sent_count += 1

        return sent_count
    finally:
        db.close()