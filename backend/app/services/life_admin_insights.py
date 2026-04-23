from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.life_admin_item import LifeAdminItem
from app.models.user import User


def get_life_admin_insights(db: Session, user: User) -> dict:
    now = datetime.utcnow()

    items = db.scalars(
        select(LifeAdminItem).where(LifeAdminItem.user_id == user.id)
    ).all()

    urgent_item_count = sum(
        1 for item in items
        if item.status == "pending" and item.due_at is not None and item.due_at <= now + timedelta(days=3)
    )

    escalated_item_count = sum(
        1 for item in items
        if item.status == "pending" and item.escalation_level > 0
    )

    upcoming_bill_count = sum(
        1 for item in items
        if item.status == "pending" and item.item_type == "bill" and item.due_at is not None and item.due_at <= now + timedelta(days=7)
    )

    missed_admin_count = sum(
        1 for item in items
        if item.status != "completed" and item.due_at is not None and item.due_at < now
    )

    pending_sorted = sorted(
        [item for item in items if item.status == "pending"],
        key=lambda x: (x.due_at or datetime.max, -x.escalation_level),
    )
    next_admin_item = pending_sorted[0].title if pending_sorted else None

    return {
        "urgent_item_count": urgent_item_count,
        "escalated_item_count": escalated_item_count,
        "upcoming_bill_count": upcoming_bill_count,
        "missed_admin_count": missed_admin_count,
        "next_admin_item": next_admin_item,
    }