from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_recommendation import HealthRecommendation
from app.models.user import User
from app.models.workout_session import WorkoutSession
from app.schemas.orchestrator import AgentInput, AgentOutput, CandidateItem
from app.services.health_insights import get_health_insights


def run_health_routine_agent(db: Session, user: User, agent_input: AgentInput) -> AgentOutput:
    insights = get_health_insights(db, user)

    candidate_items: list[CandidateItem] = []

    planned_sessions = db.scalars(
        select(WorkoutSession)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "planned",
        )
        .order_by(WorkoutSession.scheduled_start_at.asc())
    ).all()

    for session in planned_sessions[:3]:
        candidate_items.append(
            CandidateItem(
                source_agent="health_routine_agent",
                item_type="workout_session",
                title=session.title,
                description=session.notes,
                suggested_start_at=session.scheduled_start_at,
                suggested_end_at=session.scheduled_end_at,
                priority_score=7.0,
                urgency_score=6.0,
                feasibility_score=8.0,
                reference_type="workout_session",
                reference_id=session.id,
                reasoning=(
                    f"Recovery score is {insights['recovery_score']}. "
                    f"Recommended action is {insights['recommended_action']}."
                ),
            )
        )

    recommendations = db.scalars(
        select(HealthRecommendation)
        .where(
            HealthRecommendation.user_id == user.id,
            HealthRecommendation.status == "active",
        )
        .order_by(HealthRecommendation.priority_score.desc())
    ).all()

    for recommendation in recommendations[:3]:
        urgency = 7.0

        if recommendation.recommendation_type in {"sleep_correction", "hydration_focus"}:
            urgency = 8.5

        candidate_items.append(
            CandidateItem(
                source_agent="health_routine_agent",
                item_type="health_recommendation",
                title=recommendation.title,
                description=recommendation.description,
                suggested_start_at=datetime.utcnow() + timedelta(hours=1),
                suggested_end_at=datetime.utcnow() + timedelta(hours=1, minutes=20),
                priority_score=float(recommendation.priority_score),
                urgency_score=urgency,
                feasibility_score=9.0,
                reference_type="health_recommendation",
                reference_id=recommendation.id,
                reasoning="Health recommendation generated from recovery and manual user input.",
            )
        )

    return AgentOutput(
        agent_name="health_routine_agent",
        summary="Generated practical health actions from workouts, recovery logs, and health recommendations.",
        candidate_items=candidate_items,
    )