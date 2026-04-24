from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application_followup import ApplicationFollowUp
from app.models.interview import Interview
from app.models.job_application import JobApplication
from app.models.task import Task


def generate_followups_for_user(db: Session, user_id: int) -> int:
    applications = db.scalars(
        select(JobApplication).where(
            JobApplication.user_id == user_id,
            JobApplication.status == "active",
            JobApplication.stage.in_(["applied", "recruiter_screen", "interview"]),
        )
    ).all()

    created_count = 0

    for application in applications:
        follow_up_at = application.last_update_at + timedelta(days=5)

        existing = db.scalar(
            select(ApplicationFollowUp).where(
                ApplicationFollowUp.application_id == application.id,
                ApplicationFollowUp.follow_up_at == follow_up_at,
            )
        )
        if existing:
            continue

        if follow_up_at <= datetime.utcnow() + timedelta(days=7):
            followup = ApplicationFollowUp(
                application_id=application.id,
                follow_up_at=follow_up_at,
                status="pending",
            )
            db.add(followup)
            created_count += 1

    db.commit()
    return created_count


def generate_interview_prep_tasks(db: Session, user_id: int, interview: Interview) -> int:
    prep_items = [
        {
            "title": "Prepare behavioral stories for interview",
            "description": "Draft STAR stories for ownership, conflict, failure, and technical project impact.",
            "priority": "high",
        },
        {
            "title": "Review role-specific technical topics",
            "description": "Review DSA, system design, backend fundamentals, and project talking points.",
            "priority": "high",
        },
        {
            "title": "Prepare company and role questions",
            "description": "Write thoughtful questions about team, product, engineering process, and success expectations.",
            "priority": "medium",
        },
    ]

    created_count = 0

    for item in prep_items:
        existing = db.scalar(
            select(Task).where(
                Task.user_id == user_id,
                Task.title == item["title"],
                Task.description == item["description"],
            )
        )
        if existing:
            continue

        task = Task(
            user_id=user_id,
            title=item["title"],
            description=item["description"],
            status="pending",
            priority=item["priority"],
            due_at=interview.scheduled_at - timedelta(hours=12),
            scheduled_for=interview.scheduled_at - timedelta(days=1),
            estimated_minutes=60,
        )
        db.add(task)
        created_count += 1

    interview.preparation_status = "tasks_generated"
    db.commit()

    return created_count