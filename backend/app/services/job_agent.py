from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application_followup import ApplicationFollowUp
from app.models.company import Company
from app.models.interview import Interview
from app.models.job_application import JobApplication
from app.models.job_posting import JobPosting
from app.models.user import User
from app.schemas.orchestrator import AgentInput, AgentOutput, CandidateItem
from app.services.job_insights import get_job_insights


def run_job_search_agent(db: Session, user: User, agent_input: AgentInput) -> AgentOutput:
    now = datetime.utcnow()
    insights = get_job_insights(db, user)

    applications = db.scalars(
        select(JobApplication)
        .where(
            JobApplication.user_id == user.id,
            JobApplication.status == "active",
        )
        .order_by(JobApplication.last_update_at.asc())
    ).all()

    application_ids = [app.id for app in applications]

    candidate_items: list[CandidateItem] = []

    if application_ids:
        followups = db.scalars(
            select(ApplicationFollowUp)
            .where(
                ApplicationFollowUp.application_id.in_(application_ids),
                ApplicationFollowUp.status == "pending",
            )
            .order_by(ApplicationFollowUp.follow_up_at.asc())
        ).all()

        for followup in followups[:3]:
            application = db.scalar(
                select(JobApplication).where(JobApplication.id == followup.application_id)
            )
            if not application:
                continue

            company = db.scalar(select(Company).where(Company.id == application.company_id))
            posting = db.scalar(select(JobPosting).where(JobPosting.id == application.job_posting_id))

            urgency_score = 8.5 if followup.follow_up_at <= now else 6.5

            candidate_items.append(
                CandidateItem(
                    source_agent="job_search_agent",
                    item_type="application_followup",
                    title=f"Follow up: {company.name if company else 'Company'} - {posting.title if posting else 'Role'}",
                    description="Follow up on active job application.",
                    suggested_start_at=followup.follow_up_at,
                    suggested_end_at=followup.follow_up_at + timedelta(minutes=20),
                    priority_score=7.5,
                    urgency_score=urgency_score,
                    feasibility_score=8.5,
                    reference_type="application_followup",
                    reference_id=followup.id,
                    reasoning=(
                        f"Pipeline health score is {insights['pipeline_health_score']}. "
                        f"Pending follow-ups: {insights['pending_followups']}."
                    ),
                )
            )

        interviews = db.scalars(
            select(Interview)
            .where(
                Interview.application_id.in_(application_ids),
                Interview.status == "scheduled",
                Interview.scheduled_at >= now,
                Interview.scheduled_at <= now + timedelta(days=7),
            )
            .order_by(Interview.scheduled_at.asc())
        ).all()

        for interview in interviews[:3]:
            application = db.scalar(
                select(JobApplication).where(JobApplication.id == interview.application_id)
            )
            if not application:
                continue

            company = db.scalar(select(Company).where(Company.id == application.company_id))
            posting = db.scalar(select(JobPosting).where(JobPosting.id == application.job_posting_id))

            candidate_items.append(
                CandidateItem(
                    source_agent="job_search_agent",
                    item_type="interview_prep",
                    title=f"Prepare for interview: {company.name if company else 'Company'} - {posting.title if posting else 'Role'}",
                    description="Prepare role-specific technical and behavioral interview material.",
                    suggested_start_at=interview.scheduled_at - timedelta(days=1),
                    suggested_end_at=interview.scheduled_at - timedelta(days=1) + timedelta(minutes=90),
                    priority_score=9.0,
                    urgency_score=9.0,
                    feasibility_score=8.0,
                    reference_type="interview",
                    reference_id=interview.id,
                    reasoning="Upcoming interview requires preparation before the scheduled date.",
                )
            )

    stale_apps = [
        app for app in applications
        if (now - app.last_update_at).days >= 7
    ]

    for app in stale_apps[:2]:
        company = db.scalar(select(Company).where(Company.id == app.company_id))
        posting = db.scalar(select(JobPosting).where(JobPosting.id == app.job_posting_id))

        candidate_items.append(
            CandidateItem(
                source_agent="job_search_agent",
                item_type="stale_application_review",
                title=f"Review stale application: {company.name if company else 'Company'} - {posting.title if posting else 'Role'}",
                description="Application has not moved recently. Decide whether to follow up, archive, or prepare next action.",
                priority_score=6.5,
                urgency_score=6.0,
                feasibility_score=8.0,
                reference_type="job_application",
                reference_id=app.id,
                reasoning="Application has been stale for 7 or more days.",
            )
        )

    return AgentOutput(
        agent_name="job_search_agent",
        summary="Generated job pipeline actions from follow-ups, interviews, stale applications, and pipeline health.",
        candidate_items=candidate_items,
    )