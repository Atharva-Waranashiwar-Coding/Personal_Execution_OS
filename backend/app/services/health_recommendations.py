from sqlalchemy.orm import Session

from app.models.health_recommendation import HealthRecommendation
from app.models.recovery_log import RecoveryLog
from app.services.health_recovery import classify_recovery


def create_recommendations_from_recovery(
    db: Session,
    user_id: int,
    recovery_log: RecoveryLog,
) -> list[HealthRecommendation]:
    action = classify_recovery(recovery_log.recovery_score)
    recommendations: list[HealthRecommendation] = []

    if action == "full_workout":
        recommendations.append(
            HealthRecommendation(
                user_id=user_id,
                recommendation_type="full_workout",
                title="You are ready for a full workout",
                description="Recovery looks good enough for a normal session.",
                priority_score=7,
                reference_type="recovery_log",
                reference_id=recovery_log.id,
            )
        )

    elif action == "light_session":
        recommendations.append(
            HealthRecommendation(
                user_id=user_id,
                recommendation_type="light_session",
                title="Do a light workout today",
                description="Recovery is acceptable, but a lower intensity session is safer.",
                priority_score=8,
                reference_type="recovery_log",
                reference_id=recovery_log.id,
            )
        )

    elif action == "recovery_day":
        recommendations.append(
            HealthRecommendation(
                user_id=user_id,
                recommendation_type="recovery_day",
                title="Take a recovery-focused session",
                description="Focus on stretching, mobility, walking, or light movement.",
                priority_score=9,
                reference_type="recovery_log",
                reference_id=recovery_log.id,
            )
        )

    else:
        recommendations.append(
            HealthRecommendation(
                user_id=user_id,
                recommendation_type="sleep_correction",
                title="Prioritize sleep correction",
                description="Recovery is too low. Keep movement light and fix sleep first.",
                priority_score=10,
                reference_type="recovery_log",
                reference_id=recovery_log.id,
            )
        )

    if recovery_log.hydration_level is not None and recovery_log.hydration_level <= 4:
        recommendations.append(
            HealthRecommendation(
                user_id=user_id,
                recommendation_type="hydration_focus",
                title="Hydration focus",
                description="Hydration level is low. Increase water intake today.",
                priority_score=8,
                reference_type="recovery_log",
                reference_id=recovery_log.id,
            )
        )

    for recommendation in recommendations:
        db.add(recommendation)

    db.commit()

    for recommendation in recommendations:
        db.refresh(recommendation)

    return recommendations