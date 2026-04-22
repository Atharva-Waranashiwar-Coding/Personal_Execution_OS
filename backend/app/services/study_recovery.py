from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.study_session import StudySession
from app.models.study_streak import StudyStreak
from app.models.user import User


def mark_missed_sessions_and_carry_forward(db: Session, user: User) -> list[StudySession]:
    now = datetime.utcnow()

    missed_sessions = db.scalars(
        select(StudySession).where(
            StudySession.user_id == user.id,
            StudySession.status == "scheduled",
            StudySession.scheduled_end_at < now,
        )
    ).all()

    created_sessions: list[StudySession] = []

    streak = db.scalar(select(StudyStreak).where(StudyStreak.user_id == user.id))
    if not streak:
        streak = StudyStreak(user_id=user.id)
        db.add(streak)
        db.commit()
        db.refresh(streak)

    for missed in missed_sessions:
        missed.status = "missed"

        new_start = now.replace(second=0, microsecond=0) + timedelta(hours=2)
        new_end = new_start + timedelta(minutes=missed.planned_minutes)

        carry_forward = StudySession(
            user_id=user.id,
            topic_id=missed.topic_id,
            subtopic_id=missed.subtopic_id,
            title=f"{missed.title} (Carry Forward)",
            description=missed.description,
            scheduled_start_at=new_start,
            scheduled_end_at=new_end,
            planned_minutes=missed.planned_minutes,
            energy_preference=missed.energy_preference,
            session_type=missed.session_type,
            status="scheduled",
            carry_forward_count=missed.carry_forward_count + 1,
            explanation_text="Previous session was missed, so this session was rescheduled.",
        )
        db.add(carry_forward)
        created_sessions.append(carry_forward)

    if missed_sessions:
        streak.last_recovery_at = now
        streak.current_streak_days = 0

    db.commit()

    for item in created_sessions:
        db.refresh(item)

    return created_sessions


def update_streak_for_completed_session(db: Session, user: User, completed_session: StudySession) -> StudyStreak:
    streak = db.scalar(select(StudyStreak).where(StudyStreak.user_id == user.id))
    if not streak:
        streak = StudyStreak(user_id=user.id)
        db.add(streak)
        db.commit()
        db.refresh(streak)

    completion_day = completed_session.scheduled_end_at.date()
    previous_day = streak.last_completed_session_at.date() if streak.last_completed_session_at else None

    if previous_day is None:
        streak.current_streak_days = 1
    else:
        delta_days = (completion_day - previous_day).days
        if delta_days == 1:
            streak.current_streak_days += 1
        elif delta_days == 0:
            pass
        else:
            streak.current_streak_days = 1

    if streak.current_streak_days > streak.longest_streak_days:
        streak.longest_streak_days = streak.current_streak_days

    streak.last_completed_session_at = completed_session.scheduled_end_at
    db.commit()
    db.refresh(streak)

    return streak