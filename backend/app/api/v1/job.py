from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.application_followup import ApplicationFollowUp
from app.models.company import Company
from app.models.interview import Interview
from app.models.job_application import JobApplication
from app.models.job_posting import JobPosting
from app.models.resume_variant import ResumeVariant
from app.models.task import Task
from app.models.user import User
from app.schemas.job import (
    CompanyCreate,
    CompanyResponse,
    FollowUpCreate,
    FollowUpResponse,
    FollowUpUpdate,
    InterviewCreate,
    InterviewResponse,
    InterviewUpdate,
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdate,
    JobInsightResponse,
    JobPostingCreate,
    JobPostingResponse,
    ResumeVariantCreate,
    ResumeVariantResponse,
)
from app.services.job_fit_engine import compute_fit_score
from app.services.job_insights import get_job_insights
from app.services.job_workflow import generate_followups_for_user, generate_interview_prep_tasks

router = APIRouter()


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Company]:
    companies = db.scalars(select(Company).order_by(Company.name.asc())).all()
    return list(companies)


@router.post("/postings", response_model=JobPostingResponse, status_code=status.HTTP_201_CREATED)
def create_job_posting(
    payload: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobPosting:
    company = db.scalar(select(Company).where(Company.id == payload.company_id))
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")

    posting = JobPosting(**payload.model_dump())
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return posting


@router.get("/postings", response_model=list[JobPostingResponse])
def list_job_postings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobPosting]:
    postings = db.scalars(
        select(JobPosting).order_by(JobPosting.created_at.desc())
    ).all()
    return list(postings)


@router.post("/resumes", response_model=ResumeVariantResponse, status_code=status.HTTP_201_CREATED)
def create_resume_variant(
    payload: ResumeVariantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeVariant:
    resume = ResumeVariant(user_id=current_user.id, **payload.model_dump())
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/resumes", response_model=list[ResumeVariantResponse])
def list_resume_variants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ResumeVariant]:
    resumes = db.scalars(
        select(ResumeVariant)
        .where(ResumeVariant.user_id == current_user.id)
        .order_by(ResumeVariant.created_at.desc())
    ).all()
    return list(resumes)


@router.post("/applications", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobApplication:
    company = db.scalar(select(Company).where(Company.id == payload.company_id))
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")

    posting = db.scalar(select(JobPosting).where(JobPosting.id == payload.job_posting_id))
    if not posting:
        raise HTTPException(status_code=400, detail="Job posting not found")

    resume = db.scalar(
        select(ResumeVariant).where(
            ResumeVariant.id == payload.resume_variant_id,
            ResumeVariant.user_id == current_user.id,
        )
    )
    if not resume:
        raise HTTPException(status_code=400, detail="Resume variant not found for user")

    application = JobApplication(
        user_id=current_user.id,
        company_id=payload.company_id,
        job_posting_id=payload.job_posting_id,
        resume_variant_id=payload.resume_variant_id,
        stage=payload.stage,
        status=payload.status,
        notes=payload.notes,
    )

    application.fit_score = compute_fit_score(posting, resume)

    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/applications", response_model=list[JobApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobApplication]:
    applications = db.scalars(
        select(JobApplication)
        .where(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.applied_at.desc())
    ).all()
    return list(applications)


@router.put("/applications/{application_id}", response_model=JobApplicationResponse)
def update_application(
    application_id: int,
    payload: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobApplication:
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "resume_variant_id" in update_data and update_data["resume_variant_id"] is not None:
        resume = db.scalar(
            select(ResumeVariant).where(
                ResumeVariant.id == update_data["resume_variant_id"],
                ResumeVariant.user_id == current_user.id,
            )
        )
        if not resume:
            raise HTTPException(status_code=400, detail="Resume variant not found for user")

    for key, value in update_data.items():
        setattr(application, key, value)

    application.last_update_at = datetime.utcnow()

    db.commit()
    db.refresh(application)
    return application


@router.post("/interviews", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Interview:
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == payload.application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=400, detail="Application not found for user")

    interview = Interview(**payload.model_dump())
    db.add(interview)

    application.stage = "interview"
    application.last_update_at = datetime.utcnow()

    db.commit()
    db.refresh(interview)
    return interview


@router.get("/interviews", response_model=list[InterviewResponse])
def list_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Interview]:
    applications = db.scalars(
        select(JobApplication.id).where(JobApplication.user_id == current_user.id)
    ).all()

    if not applications:
        return []

    interviews = db.scalars(
        select(Interview)
        .where(Interview.application_id.in_(applications))
        .order_by(Interview.scheduled_at.asc())
    ).all()
    return list(interviews)


@router.put("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Interview:
    interview = db.scalar(select(Interview).where(Interview.id == interview_id))
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == interview.application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=404, detail="Interview not found for user")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(interview, key, value)

    db.commit()
    db.refresh(interview)
    return interview


@router.post("/followups", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup(
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationFollowUp:
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == payload.application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=400, detail="Application not found for user")

    followup = ApplicationFollowUp(**payload.model_dump())
    db.add(followup)
    db.commit()
    db.refresh(followup)
    return followup


@router.get("/followups", response_model=list[FollowUpResponse])
def list_followups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ApplicationFollowUp]:
    applications = db.scalars(
        select(JobApplication.id).where(JobApplication.user_id == current_user.id)
    ).all()

    if not applications:
        return []

    followups = db.scalars(
        select(ApplicationFollowUp)
        .where(ApplicationFollowUp.application_id.in_(applications))
        .order_by(ApplicationFollowUp.follow_up_at.asc())
    ).all()
    return list(followups)


@router.put("/followups/{followup_id}", response_model=FollowUpResponse)
def update_followup(
    followup_id: int,
    payload: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationFollowUp:
    followup = db.scalar(select(ApplicationFollowUp).where(ApplicationFollowUp.id == followup_id))
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == followup.application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=404, detail="Follow-up not found for user")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(followup, key, value)

    db.commit()
    db.refresh(followup)
    return followup


@router.post("/followups/generate")
def generate_followups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    created_count = generate_followups_for_user(db, current_user.id)
    return {"created_count": created_count}


@router.post("/interviews/{interview_id}/generate-prep")
def generate_interview_prep(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    interview = db.scalar(select(Interview).where(Interview.id == interview_id))
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == interview.application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    if not application:
        raise HTTPException(status_code=404, detail="Interview not found for user")

    created_count = generate_interview_prep_tasks(db, current_user.id, interview)
    return {"created_count": created_count}


@router.get("/insights", response_model=JobInsightResponse)
def job_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobInsightResponse:
    payload = get_job_insights(db, current_user)
    return JobInsightResponse(**payload)