from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.life_admin_item import LifeAdminItem
from app.models.life_admin_recurrence import LifeAdminRecurrence


def next_due_for_rule(current_due, rule: str):
    if current_due is None:
        return None

    if rule == "daily":
        return current_due + timedelta(days=1)
    if rule == "weekly":
        return current_due + timedelta(weeks=1)
    if rule == "monthly":
        return current_due + timedelta(days=30)

    return None


def generate_recurring_life_admin_items(db: Session, user_id: int) -> list[LifeAdminItem]:
    recurrences = db.scalars(
        select(LifeAdminRecurrence).where(LifeAdminRecurrence.user_id == user_id)
    ).all()

    created_items: list[LifeAdminItem] = []

    for recurrence in recurrences:
        parent_item = db.scalar(select(LifeAdminItem).where(LifeAdminItem.id == recurrence.item_id))
        if not parent_item or not recurrence.next_due_at:
            continue

        create_at = recurrence.next_due_at - timedelta(days=recurrence.lead_time_days)
        should_generate = create_at <= recurrence.next_due_at

        if not should_generate:
            continue

        existing = db.scalar(
            select(LifeAdminItem).where(
                LifeAdminItem.user_id == user_id,
                LifeAdminItem.recurrence_parent_id == parent_item.id,
                LifeAdminItem.due_at == recurrence.next_due_at,
            )
        )
        if existing:
            continue

        item = LifeAdminItem(
            user_id=user_id,
            item_type=parent_item.item_type,
            title=parent_item.title,
            description=parent_item.description,
            status="pending",
            priority=parent_item.priority,
            due_at=recurrence.next_due_at,
            is_recurring_template=False,
            recurrence_parent_id=parent_item.id,
            escalation_level=0,
            reminder_required=parent_item.reminder_required,
            source="recurrence",
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        recurrence.last_generated_at = recurrence.next_due_at
        recurrence.next_due_at = next_due_for_rule(recurrence.next_due_at, recurrence.recurrence_rule)
        db.commit()

        created_items.append(item)

    return created_items