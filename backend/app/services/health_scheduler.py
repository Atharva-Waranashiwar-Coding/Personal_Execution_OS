from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.plan import Plan
from app.models.recovery_log import RecoveryLog
from app.models.workout_preference import WorkoutPreference
from app.models.workout_session import WorkoutSession
from app.models.user import User
from app.services.health_recovery import classify_recovery


def get_latest_recovery_log(db: Session, user_id: int) -> RecoveryLog | None:
    return db.scalar(
        select(RecoveryLog)
        .where(RecoveryLog.user_id == user_id)
        .order_by(RecoveryLog.logged_at.desc())
    )


def find_available_workout_slot(
    db: Session,
    user_id: int,
    duration_minutes: int,
) -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    preferred_start = now.replace(hour=18, minute=0, second=0, microsecond=0)

    if preferred_start < now:
        preferred_start = now + timedelta(hours=2)

    existing_plans = db.scalars(
        select(Plan).where(
            Plan.user_id == user_id,
            Plan.start_at.is_not(None),
            Plan.end_at.is_not(None),
        )
    ).all()

    existing_sessions = db.scalars(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status.in_(["planned", "completed"]),
            WorkoutSession.scheduled_start_at.is_not(None),
            WorkoutSession.scheduled_end_at.is_not(None),
        )
    ).all()

    blocked_windows: list[tuple[datetime, datetime]] = []

    for plan in existing_plans:
        blocked_windows.append((plan.start_at, plan.end_at))

    for session in existing_sessions:
        blocked_windows.append((session.scheduled_start_at, session.scheduled_end_at))

    candidate_start = preferred_start
    candidate_end = candidate_start + timedelta(minutes=duration_minutes)

    def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
        return max(a_start, b_start) < min(a_end, b_end)

    while True:
        conflict = False
        for block_start, block_end in blocked_windows:
            if overlaps(candidate_start, candidate_end, block_start, block_end):
                candidate_start = block_end + timedelta(minutes=15)
                candidate_end = candidate_start + timedelta(minutes=duration_minutes)
                conflict = True
                break

        if not conflict:
            return candidate_start, candidate_end


def choose_workout_type(db: Session, user_id: int) -> str:
    preference = db.scalar(
        select(WorkoutPreference)
        .where(
            WorkoutPreference.user_id == user_id,
            WorkoutPreference.is_active == True,  # noqa: E712
        )
        .order_by(WorkoutPreference.priority.desc())
    )

    if preference:
        return preference.workout_type

    return "general_workout"


def generate_workout_session(
    db: Session,
    user: User,
    *,
    available_minutes: int,
    energy_level: int,
) -> WorkoutSession:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))

    if not profile:
        profile = HealthProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    latest_recovery = get_latest_recovery_log(db, user.id)
    recovery_score = latest_recovery.recovery_score if latest_recovery else 70
    action = classify_recovery(recovery_score)

    if action == "full_workout":
        duration = min(profile.ideal_session_minutes, available_minutes)
        intensity = "high" if energy_level >= 8 else "medium"
    elif action == "light_session":
        duration = min(max(profile.minimum_session_minutes, 30), available_minutes)
        intensity = "low"
    elif action == "recovery_day":
        duration = min(30, available_minutes)
        intensity = "recovery"
    else:
        duration = min(20, available_minutes)
        intensity = "recovery"

    duration = max(duration, min(profile.minimum_session_minutes, available_minutes))

    workout_type = choose_workout_type(db, user.id)

    start_at, end_at = find_available_workout_slot(db, user.id, duration)

    if action == "sleep_correction":
        title = "Sleep correction and mobility session"
        workout_type = "recovery"
    elif action == "recovery_day":
        title = "Recovery day mobility session"
        workout_type = "recovery"
    elif action == "light_session":
        title = f"Light {workout_type} session"
    else:
        title = f"Full {workout_type} workout"

    session = WorkoutSession(
        user_id=user.id,
        workout_type=workout_type,
        title=title,
        scheduled_start_at=start_at,
        scheduled_end_at=end_at,
        planned_minutes=duration,
        intensity=intensity,
        status="planned",
        notes=f"Generated based on recovery score {recovery_score} and energy level {energy_level}.",
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session