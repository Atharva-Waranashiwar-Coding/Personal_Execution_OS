from datetime import datetime
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    industry: str | None = None
    website: str | None = None


class CompanyResponse(CompanyCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobPostingCreate(BaseModel):
    company_id: int
    title: str
    description: str | None = None
    location: str | None = None
    job_type: str | None = None
    posted_at: datetime | None = None
    deadline_at: datetime | None = None


class JobPostingResponse(JobPostingCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeVariantCreate(BaseModel):
    name: str
    focus_area: str
    version: str = "v1"


class ResumeVariantResponse(ResumeVariantCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobApplicationCreate(BaseModel):
    company_id: int
    job_posting_id: int
    resume_variant_id: int
    stage: str = "applied"
    status: str = "active"
    notes: str | None = None


class JobApplicationUpdate(BaseModel):
    stage: str | None = None
    status: str | None = None
    resume_variant_id: int | None = None
    notes: str | None = None
    fit_score: float | None = None


class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_id: int
    job_posting_id: int
    resume_variant_id: int
    stage: str
    status: str
    applied_at: datetime
    last_update_at: datetime
    fit_score: float
    notes: str | None

    class Config:
        from_attributes = True


class InterviewCreate(BaseModel):
    application_id: int
    interview_type: str
    scheduled_at: datetime
    status: str = "scheduled"
    preparation_status: str = "pending"


class InterviewUpdate(BaseModel):
    interview_type: str | None = None
    scheduled_at: datetime | None = None
    status: str | None = None
    preparation_status: str | None = None


class InterviewResponse(InterviewCreate):
    id: int

    class Config:
        from_attributes = True


class FollowUpCreate(BaseModel):
    application_id: int
    follow_up_at: datetime
    status: str = "pending"


class FollowUpUpdate(BaseModel):
    follow_up_at: datetime | None = None
    status: str | None = None


class FollowUpResponse(FollowUpCreate):
    id: int

    class Config:
        from_attributes = True


class JobInsightResponse(BaseModel):
    active_applications: int
    stale_applications: int
    upcoming_interviews: int
    upcoming_deadlines: int
    pending_followups: int
    weekly_application_count: int
    weekly_target_count: int
    pipeline_health_score: float