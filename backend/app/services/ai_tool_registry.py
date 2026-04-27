from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.interview_track import InterviewTrack
from app.models.life_admin_item import LifeAdminItem
from app.models.study_subtopic import StudySubtopic
from app.models.study_topic import StudyTopic
from app.models.task import Task
from app.models.user import User
from app.services.health_scheduler import generate_workout_session
from app.services.life_admin_capture import normalize_life_admin_text
from app.services.orchestrator_service import generate_orchestrated_plan
from app.services.study_focus_engine import generate_study_sessions


def parse_loose_deadline(value: str | None) -> datetime | None:
    if not value:
        return None

    lowered = value.lower()
    now = datetime.utcnow()

    if "tomorrow" in lowered:
        return now + timedelta(days=1)
    if "week" in lowered:
        return now + timedelta(days=7)
    if "month" in lowered:
        return now + timedelta(days=30)
    if "2 months" in lowered or "two months" in lowered:
        return now + timedelta(days=60)

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def create_study_plan_from_payload(db: Session, user: User, payload: dict) -> dict:
    topic_name = payload.get("topic") or "Interview Preparation"
    deadline = parse_loose_deadline(payload.get("deadline") or payload.get("timeline"))

    track = InterviewTrack(
        user_id=user.id,
        name=f"{topic_name} Track",
        description=f"AI-created track for {topic_name}",
        target_role=payload.get("target_role"),
        target_company=payload.get("company"),
        status="active",
    )
    db.add(track)
    db.commit()
    db.refresh(track)

    default_topics = [
        topic_name,
        "Core concepts",
        "Practice problems",
        "Mock interview review",
    ]

    created_topic_ids = []
    created_subtopic_ids = []

    for index, name in enumerate(default_topics, start=1):
        topic = StudyTopic(
            user_id=user.id,
            interview_track_id=track.id,
            name=name,
            description=f"AI-generated study topic: {name}",
            difficulty="medium",
            status="not_started",
            backlog_size=5,
            priority_weight=10 - index,
            deadline_at=deadline,
            estimated_total_minutes=180,
        )
        db.add(topic)
        db.commit()
        db.refresh(topic)
        created_topic_ids.append(topic.id)

        subtopic = StudySubtopic(
            user_id=user.id,
            topic_id=topic.id,
            name=f"{name} fundamentals",
            description="AI-generated subtopic",
            difficulty="medium",
            status="not_started",
            estimated_minutes=90,
            is_high_priority=index == 1,
            deadline_at=deadline,
        )
        db.add(subtopic)
        db.commit()
        db.refresh(subtopic)
        created_subtopic_ids.append(subtopic.id)

    sessions = generate_study_sessions(
        db,
        user,
        energy_preference="medium",
        available_hours=3,
    )

    brief, items = generate_orchestrated_plan(db, user)

    return {
        "track_id": track.id,
        "topic_ids": created_topic_ids,
        "subtopic_ids": created_subtopic_ids,
        "study_session_ids": [session.id for session in sessions],
        "plan_brief_id": brief.id,
        "plan_item_ids": [item.id for item in items],
    }


def create_health_plan_from_payload(db: Session, user: User, payload: dict) -> dict:
    goal = payload.get("goal") or "general_fitness"

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))

    if not profile:
        profile = HealthProfile(
            user_id=user.id,
            primary_goal=goal,
            fitness_level="beginner",
            preferred_workout_time="evening",
            weekly_workout_target=4,
            minimum_session_minutes=30,
            ideal_session_minutes=60,
            notes="AI-created health profile",
        )
        db.add(profile)
    else:
        profile.primary_goal = goal

    db.commit()
    db.refresh(profile)

    sessions = []
    for _ in range(3):
        session = generate_workout_session(
            db,
            user,
            available_minutes=60,
            energy_level=7,
        )
        sessions.append(session)

    brief, items = generate_orchestrated_plan(db, user)

    return {
        "health_profile_id": profile.id,
        "workout_session_ids": [session.id for session in sessions],
        "plan_brief_id": brief.id,
        "plan_item_ids": [item.id for item in items],
    }


def create_life_admin_from_payload(db: Session, user: User, payload: dict) -> dict:
    raw_text = payload.get("goal") or payload.get("topic") or payload.get("constraints") or "Life admin item"
    normalized = normalize_life_admin_text(raw_text)

    item = LifeAdminItem(
        user_id=user.id,
        item_type=normalized["item_type"],
        title=normalized["title"],
        description=normalized.get("description"),
        priority=normalized["priority"],
        due_at=normalized.get("due_at"),
        source="ai_command",
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    brief, items = generate_orchestrated_plan(db, user)

    return {
        "life_admin_item_id": item.id,
        "plan_brief_id": brief.id,
        "plan_item_ids": [plan_item.id for plan_item in items],
    }


def create_general_execution_plan(db: Session, user: User, payload: dict) -> dict:
    title = payload.get("goal") or payload.get("topic") or "AI-created task"

    task = Task(
        user_id=user.id,
        title=title,
        description=payload.get("constraints"),
        status="pending",
        priority="high",
        due_at=parse_loose_deadline(payload.get("deadline") or payload.get("timeline")),
        estimated_minutes=60,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    brief, items = generate_orchestrated_plan(db, user)

    return {
        "task_id": task.id,
        "plan_brief_id": brief.id,
        "plan_item_ids": [item.id for item in items],
    }


def execute_ai_tool(db: Session, user: User, intent: str, payload: dict) -> dict:
    if intent == "study_plan_creation":
        return create_study_plan_from_payload(db, user, payload)

    if intent == "health_goal_plan":
        return create_health_plan_from_payload(db, user, payload)

    if intent == "life_admin_capture":
        return create_life_admin_from_payload(db, user, payload)

    if intent == "job_search_plan":
        return create_general_execution_plan(db, user, payload)

    if intent == "general_execution_plan":
        return create_general_execution_plan(db, user, payload)

    return {
        "message": "No safe tool was selected for this command."
    }