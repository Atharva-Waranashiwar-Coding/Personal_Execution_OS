from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.health_profile import HealthProfile
from app.models.job_application import JobApplication
from app.models.job_posting import JobPosting
from app.models.life_admin_item import LifeAdminItem
from app.models.resume_variant import ResumeVariant
from app.models.study_topic import StudyTopic
from app.models.task import Task
from app.models.user import User
from app.models.workout_preference import WorkoutPreference


def seed_demo_data(db: Session, user: User) -> dict:
    now = datetime.utcnow()

    task = Task(
        user_id=user.id,
        title="Review system design notes",
        description="Focus on scalability and queues",
        status="pending",
        priority="high",
        due_at=now + timedelta(days=1),
        scheduled_for=now + timedelta(hours=3),
        estimated_minutes=90,
    )
    db.add(task)

    study_topic = StudyTopic(
        user_id=user.id,
        name="System Design Basics",
        description="Load balancers, caching, queues, database scaling",
        difficulty="medium",
        status="in_progress",
        backlog_size=8,
        priority_weight=9,
        deadline_at=now + timedelta(days=14),
        estimated_total_minutes=600,
    )
    db.add(study_topic)

    company = Company(
        name="DemoCloud AI",
        industry="AI Infrastructure",
        website="https://example.com",
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    posting = JobPosting(
        company_id=company.id,
        title="Full Stack Engineer",
        description="React TypeScript Python FastAPI PostgreSQL Docker AWS Redis",
        location="Remote",
        job_type="full-time",
        deadline_at=now + timedelta(days=7),
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)

    resume = ResumeVariant(
        user_id=user.id,
        name="Full Stack Backend Focus",
        focus_area="fullstack",
        version="demo",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    app = JobApplication(
        user_id=user.id,
        company_id=company.id,
        job_posting_id=posting.id,
        resume_variant_id=resume.id,
        stage="applied",
        status="active",
        fit_score=82,
        notes="Demo application",
    )
    db.add(app)

    life_item = LifeAdminItem(
        user_id=user.id,
        item_type="bill",
        title="Pay internet bill",
        description="Demo recurring bill",
        priority="high",
        due_at=now + timedelta(days=2),
        reminder_required=True,
        source="demo",
    )
    db.add(life_item)

    health_profile = HealthProfile(
        user_id=user.id,
        primary_goal="weight_loss",
        fitness_level="beginner",
        preferred_workout_time="evening",
        weekly_workout_target=4,
        minimum_session_minutes=30,
        ideal_session_minutes=60,
    )
    db.add(health_profile)

    workout_pref = WorkoutPreference(
        user_id=user.id,
        workout_type="strength_training",
        priority=9,
        minimum_gap_hours=24,
        recovery_window_hours=24,
    )
    db.add(workout_pref)

    db.commit()

    return {"status": "seeded"}