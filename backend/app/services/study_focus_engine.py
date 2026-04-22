from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.study_session import StudySession
from app.models.study_subtopic import StudySubtopic
from app.models.study_topic import StudyTopic
from app.models.user import User


def difficulty_weight(value: str) -> int:
    mapping = {
        "easy": 1,
        "medium": 2,
        "hard": 3,
    }
    return mapping.get(value.lower(), 2)


def energy_block_minutes(energy_preference: str) -> int:
    mapping = {
        "low": 45,
        "medium": 75,
        "high": 100,
    }
    return mapping.get(energy_preference.lower(), 75)


def compute_topic_score(topic: StudyTopic) -> float:
    deadline_score = 0.0
    if topic.deadline_at:
        days_remaining = max((topic.deadline_at - datetime.utcnow()).days, 0)
        deadline_score = 10 if days_remaining <= 3 else 7 if days_remaining <= 7 else 4

    backlog_score = min(topic.backlog_size, 10)
    difficulty_score = difficulty_weight(topic.difficulty) * 2
    progress_penalty = 0
    if topic.estimated_total_minutes and topic.completed_minutes >= topic.estimated_total_minutes:
        progress_penalty = 10

    return round(
        topic.priority_weight * 1.5
        + deadline_score
        + backlog_score
        + difficulty_score
        - progress_penalty,
        2,
    )


def find_open_study_slot(
    existing_blocks: list[tuple[datetime, datetime]],
    preferred_start: datetime,
    duration_minutes: int,
) -> tuple[datetime, datetime]:
    candidate_start = preferred_start.replace(second=0, microsecond=0)
    candidate_end = candidate_start + timedelta(minutes=duration_minutes)

    def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
        return max(a_start, b_start) < min(a_end, b_end)

    while True:
        conflict = False
        for block_start, block_end in existing_blocks:
            if overlaps(candidate_start, candidate_end, block_start, block_end):
                candidate_start = block_end + timedelta(minutes=15)
                candidate_end = candidate_start + timedelta(minutes=duration_minutes)
                conflict = True
                break
        if not conflict:
            return candidate_start, candidate_end


def generate_study_sessions(
    db: Session,
    user: User,
    *,
    energy_preference: str = "medium",
    available_hours: int = 3,
) -> list[StudySession]:
    topics = db.scalars(
        select(StudyTopic)
        .where(StudyTopic.user_id == user.id, StudyTopic.status != "completed")
    ).all()

    scored_topics = sorted(topics, key=compute_topic_score, reverse=True)
    if not scored_topics:
        return []

    duration_minutes = energy_block_minutes(energy_preference)
    max_sessions = max(int((available_hours * 60) // duration_minutes), 1)

    existing_plan_blocks = db.scalars(
        select(Plan).where(
            Plan.user_id == user.id,
            Plan.start_at.is_not(None),
            Plan.end_at.is_not(None),
        )
    ).all()

    existing_study_sessions = db.scalars(
        select(StudySession).where(
            StudySession.user_id == user.id,
            StudySession.status.in_(["scheduled", "completed"]),
        )
    ).all()

    blocked_windows: list[tuple[datetime, datetime]] = []
    for block in existing_plan_blocks:
        blocked_windows.append((block.start_at, block.end_at))
    for session in existing_study_sessions:
        blocked_windows.append((session.scheduled_start_at, session.scheduled_end_at))

    created_sessions: list[StudySession] = []
    preferred_start = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)

    for topic in scored_topics[:max_sessions]:
        subtopic = db.scalar(
            select(StudySubtopic)
            .where(
                StudySubtopic.topic_id == topic.id,
                StudySubtopic.user_id == user.id,
                StudySubtopic.status != "completed",
            )
            .order_by(StudySubtopic.is_high_priority.desc(), StudySubtopic.deadline_at.asc())
        )

        start_at, end_at = find_open_study_slot(blocked_windows, preferred_start, duration_minutes)

        title = f"Study: {topic.name}"
        if subtopic:
            title = f"Study: {topic.name} - {subtopic.name}"

        session = StudySession(
            user_id=user.id,
            topic_id=topic.id,
            subtopic_id=subtopic.id if subtopic else None,
            title=title,
            description="Auto-generated deep work study session",
            scheduled_start_at=start_at,
            scheduled_end_at=end_at,
            planned_minutes=duration_minutes,
            energy_preference=energy_preference,
            session_type="deep_work",
            status="scheduled",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        created_sessions.append(session)
        blocked_windows.append((start_at, end_at))
        preferred_start = end_at + timedelta(minutes=15)

    return created_sessions