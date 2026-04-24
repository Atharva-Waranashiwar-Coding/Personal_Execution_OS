from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.health_recommendation import HealthRecommendation
from app.models.recovery_log import RecoveryLog
from app.models.workout_session import WorkoutSession
from app.models.user import User
from app.services.health_recovery import classify_recovery


def get_health_insights(db: Session, user: User) -> dict:
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
    weekly_target = profile.weekly_workout_target if profile else 4

    latest_recovery = db.scalar(
        select(RecoveryLog)
        .where(RecoveryLog.user_id == user.id)
        .order_by(RecoveryLog.logged_at.desc())
    )

    recovery_score = latest_recovery.recovery_score if latest_recovery else 70
    recommended_action = classify_recovery(recovery_score)

    weekly_workouts_completed = len(
        db.scalars(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == "completed",
                WorkoutSession.updated_at >= week_start,
            )
        ).all()
    )

    pending_recommendations = len(
        db.scalars(
            select(HealthRecommendation).where(
                HealthRecommendation.user_id == user.id,
                HealthRecommendation.status == "active",
            )
        ).all()
    )

    last_session = db.scalar(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.created_at.desc())
    )

    return {
        "recovery_score": recovery_score,
        "recommended_action": recommended_action,
        "weekly_workouts_completed": weekly_workouts_completed,
        "weekly_workout_target": weekly_target,
        "pending_recommendations": pending_recommendations,
        "last_workout_type": last_session.workout_type if last_session else None,
    }