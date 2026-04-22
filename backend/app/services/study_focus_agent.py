from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.study_session import StudySession
from app.models.user import User
from app.schemas.orchestrator import AgentInput, AgentOutput, CandidateItem
from app.services.study_insights import get_study_insights


def run_study_focus_agent(db: Session, user: User, agent_input: AgentInput) -> AgentOutput:
    sessions = db.scalars(
        select(StudySession)
        .where(
            StudySession.user_id == user.id,
            StudySession.status == "scheduled",
        )
        .order_by(StudySession.scheduled_start_at.asc())
    ).all()

    insights = get_study_insights(db, user)

    candidate_items: list[CandidateItem] = []
    for session in sessions[:3]:
        candidate_items.append(
            CandidateItem(
                source_agent="study_focus_agent",
                item_type="study_session",
                title=session.title,
                description=session.description,
                suggested_start_at=session.scheduled_start_at,
                suggested_end_at=session.scheduled_end_at,
                priority_score=8.5,
                urgency_score=7.5,
                feasibility_score=8.0,
                reference_type="study_session",
                reference_id=session.id,
                reasoning=(
                    f"Next best topic: {insights.get('next_best_topic') or 'N/A'}. "
                    f"Weekly coverage estimate: {insights.get('estimated_weekly_coverage_minutes', 0)} minutes."
                ),
            )
        )

    return AgentOutput(
        agent_name="study_focus_agent",
        summary="Generated study candidates using structured topic and session planning logic.",
        candidate_items=candidate_items,
    )