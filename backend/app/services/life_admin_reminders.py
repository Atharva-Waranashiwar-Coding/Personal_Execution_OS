from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.life_admin_item import LifeAdminItem
from app.models.life_admin_reminder import LifeAdminReminder
from app.services.notifications import create_notification


def schedule_life_admin_reminders(db: Session, user_id: int) -> list[LifeAdminReminder]:
    items = db.scalars(
        select(LifeAdminItem).where(
            LifeAdminItem.user_id == user_id,
            LifeAdminItem.status == "pending",
            LifeAdminItem.reminder_required == True,  # noqa: E712
            LifeAdminItem.due_at.is_not(None),
        )
    ).all()

    created: list[LifeAdminReminder] = []

    for item in items:
        reminder_times = [
            item.due_at - timedelta(days=3),
            item.due_at - timedelta(days=1),
            item.due_at - timedelta(hours=6),
        ]

        for reminder_time in reminder_times:
            existing = db.scalar(
                select(LifeAdminReminder).where(
                    LifeAdminReminder.item_id == item.id,
                    LifeAdminReminder.scheduled_for == reminder_time,
                )
            )
            if existing:
                continue

            reminder = LifeAdminReminder(
                item_id=item.id,
                user_id=user_id,
                reminder_type="deadline_warning",
                scheduled_for=reminder_time,
                status="pending",
            )
            db.add(reminder)
            db.commit()
            db.refresh(reminder)
            created.append(reminder)

    return created


def send_due_life_admin_reminders(db: Session, user_id: int) -> int:
    now = datetime.utcnow()
    reminders = db.scalars(
        select(LifeAdminReminder).where(
            LifeAdminReminder.user_id == user_id,
            LifeAdminReminder.status == "pending",
            LifeAdminReminder.scheduled_for <= now,
        )
    ).all()

    sent_count = 0

    for reminder in reminders:
        item = db.scalar(select(LifeAdminItem).where(LifeAdminItem.id == reminder.item_id))
        if not item:
            reminder.status = "failed"
            reminder.retry_count += 1
            continue

        create_notification(
            db,
            user_id=user_id,
            notification_type="life_admin_reminder",
            title=f"Life Admin Reminder: {item.title}",
            body=item.description or f"Due at {item.due_at}",
            reference_type="life_admin_item",
            reference_id=item.id,
        )
        reminder.status = "sent"
        reminder.sent_at = now
        sent_count += 1

    db.commit()
    return sent_count