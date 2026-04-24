from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application_followup import ApplicationFollowUp
from app.models.interview import Interview
from app.models.job_application import JobApplication
from app.models.job_posting import JobPosting
from app.models.user import User


def get_job_insights(db: Session, user: User) -> dict:
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    week_end = now + timedelta(days=7)

    applications = db.scalars(
        select(JobApplication).where(JobApplication.user_id == user.id)
    ).all()

    application_ids = [application.id for application in applications]

    active_applications = sum(1 for app in applications if app.status == "active")

    stale_applications = sum(
        1 for app in applications
        if app.status == "active" and (now - app.last_update_at).days >= 7
    )

    weekly_application_count = sum(
        1 for app in applications
        if app.applied_at >= week_start
    )

    upcoming_interviews = 0
    pending_followups = 0

    if application_ids:
        interviews = db.scalars(
            select(Interview).where(
                Interview.application_id.in_(application_ids),
                Interview.status == "scheduled",
                Interview.scheduled_at >= now,
                Interview.scheduled_at <= week_end,
            )
        ).all()
        upcoming_interviews = len(interviews)

        followups = db.scalars(
            select(ApplicationFollowUp).where(
                ApplicationFollowUp.application_id.in_(application_ids),
                ApplicationFollowUp.status == "pending",
            )
        ).all()
        pending_followups = len(followups)

    upcoming_deadlines = 0
    postings = db.scalars(select(JobPosting)).all()
    relevant_posting_ids = {app.job_posting_id for app in applications}

    for posting in postings:
        if posting.id in relevant_posting_ids and posting.deadline_at:
            if now <= posting.deadline_at <= week_end:
                upcoming_deadlines += 1

    weekly_target_count = 10

    health_score = 100.0
    health_score -= stale_applications * 8
    health_score -= max(0, weekly_target_count - weekly_application_count) * 4
    health_score += upcoming_interviews * 5
    health_score = max(0.0, min(100.0, health_score))

    return {
        "active_applications": active_applications,
        "stale_applications": stale_applications,
        "upcoming_interviews": upcoming_interviews,
        "upcoming_deadlines": upcoming_deadlines,
        "pending_followups": pending_followups,
        "weekly_application_count": weekly_application_count,
        "weekly_target_count": weekly_target_count,
        "pipeline_health_score": round(health_score, 2),
    }