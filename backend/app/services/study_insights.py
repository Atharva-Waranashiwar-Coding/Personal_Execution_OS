from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.study_session import StudySession
from app.models.study_streak import StudyStreak
from app.models.study_subtopic import StudySubtopic
from app.models.study_topic import StudyTopic
from app.models.user import User
from app.services.study_focus_engine import compute_topic_score


def get_study_insights(db: Session, user: User) -> dict:
    topics = db.scalars(
        select(StudyTopic)
        .where(StudyTopic.user_id == user.id, StudyTopic.status != "completed")
    ).all()

    next_best_topic = None
    if topics:
        top_topic = sorted(topics, key=compute_topic_score, reverse=True)[0]
        next_best_topic = top_topic.name
    else:
        top_topic = None

    next_best_subtopic = None
    if top_topic:
        subtopic = db.scalar(
            select(StudySubtopic)
            .where(
                StudySubtopic.topic_id == top_topic.id,
                StudySubtopic.user_id == user.id,
                StudySubtopic.status != "completed",
            )
            .order_by(StudySubtopic.is_high_priority.desc(), StudySubtopic.deadline_at.asc())
        )
        if subtopic:
            next_best_subtopic = subtopic.name

    sessions = db.scalars(
        select(StudySession).where(StudySession.user_id == user.id)
    ).all()

    pending_sessions = sum(1 for s in sessions if s.status == "scheduled")
    missed_sessions = sum(1 for s in sessions if s.status == "missed")
    estimated_weekly_coverage_minutes = sum(
        s.planned_minutes for s in sessions if s.status == "scheduled"
    )

    streak = db.scalar(select(StudyStreak).where(StudyStreak.user_id == user.id))

    return {
        "next_best_topic": next_best_topic,
        "next_best_subtopic": next_best_subtopic,
        "estimated_weekly_coverage_minutes": estimated_weekly_coverage_minutes,
        "pending_sessions": pending_sessions,
        "missed_sessions": missed_sessions,
        "current_streak_days": streak.current_streak_days if streak else 0,
        "longest_streak_days": streak.longest_streak_days if streak else 0,
    }