from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.life_admin_item import LifeAdminItem
from app.models.user import User
from app.schemas.orchestrator import AgentInput, AgentOutput, CandidateItem
from app.services.life_admin_insights import get_life_admin_insights


def run_life_admin_agent(db: Session, user: User, agent_input: AgentInput) -> AgentOutput:
    insights = get_life_admin_insights(db, user)

    items = db.scalars(
        select(LifeAdminItem)
        .where(
            LifeAdminItem.user_id == user.id,
            LifeAdminItem.status == "pending",
        )
        .order_by(LifeAdminItem.escalation_level.desc(), LifeAdminItem.due_at.asc())
    ).all()

    candidate_items: list[CandidateItem] = []
    now = datetime.utcnow()

    for item in items[:5]:
        urgency_score = 4.0
        if item.due_at and item.due_at <= now + timedelta(hours=24):
            urgency_score = 9.0
        elif item.due_at and item.due_at <= now + timedelta(days=3):
            urgency_score = 7.5

        priority_score = 8.5 if item.priority == "high" else 6.0
        feasibility_score = 8.0

        candidate_items.append(
            CandidateItem(
                source_agent="life_admin_agent",
                item_type="life_admin_item",
                title=item.title,
                description=item.description,
                suggested_start_at=item.scheduled_for,
                suggested_end_at=None,
                priority_score=priority_score + item.escalation_level,
                urgency_score=urgency_score,
                feasibility_score=feasibility_score,
                reference_type="life_admin_item",
                reference_id=item.id,
                reasoning=(
                    f"Urgent admin count: {insights['urgent_item_count']}. "
                    f"Escalated item count: {insights['escalated_item_count']}."
                ),
            )
        )

    return AgentOutput(
        agent_name="life_admin_agent",
        summary="Generated life admin candidates using deadlines, escalation, and reminder-sensitive obligations.",
        candidate_items=candidate_items,
    )