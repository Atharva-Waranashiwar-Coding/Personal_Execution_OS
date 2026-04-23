from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.life_admin_item import LifeAdminItem


def apply_life_admin_escalation(db: Session, user_id: int) -> list[LifeAdminItem]:
    now = datetime.utcnow()

    items = db.scalars(
        select(LifeAdminItem).where(
            LifeAdminItem.user_id == user_id,
            LifeAdminItem.status == "pending",
            LifeAdminItem.due_at.is_not(None),
        )
    ).all()

    changed: list[LifeAdminItem] = []

    for item in items:
        if item.due_at <= now + timedelta(hours=24):
            item.escalation_level = 3
            item.priority = "high"
        elif item.due_at <= now + timedelta(days=3):
            item.escalation_level = max(item.escalation_level, 2)
        elif item.due_at <= now + timedelta(days=7):
            item.escalation_level = max(item.escalation_level, 1)

        changed.append(item)

    db.commit()
    return changed