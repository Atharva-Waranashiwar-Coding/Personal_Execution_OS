from datetime import datetime
from pydantic import BaseModel


class InterviewTrackCreate(BaseModel):
    name: str
    description: str | None = None
    target_role: str | None = None
    target_company: str | None = None
    status: str = "active"


class InterviewTrackResponse(InterviewTrackCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class StudyTopicCreate(BaseModel):
    interview_track_id: int | None = None
    name: str
    description: str | None = None
    difficulty: str = "medium"
    status: str = "not_started"
    backlog_size: int = 0
    priority_weight: int = 5
    deadline_at: datetime | None = None
    estimated_total_minutes: int | None = None


class StudyTopicUpdate(BaseModel):
    interview_track_id: int | None = None
    name: str | None = None
    description: str | None = None
    difficulty: str | None = None
    status: str | None = None
    backlog_size: int | None = None
    priority_weight: int | None = None
    deadline_at: datetime | None = None
    estimated_total_minutes: int | None = None
    completed_minutes: int | None = None


class StudyTopicResponse(StudyTopicCreate):
    id: int
    user_id: int
    completed_minutes: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudySubtopicCreate(BaseModel):
    topic_id: int
    name: str
    description: str | None = None
    difficulty: str = "medium"
    status: str = "not_started"
    estimated_minutes: int | None = None
    is_high_priority: bool = False
    deadline_at: datetime | None = None


class StudySubtopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    difficulty: str | None = None
    status: str | None = None
    estimated_minutes: int | None = None
    completed_minutes: int | None = None
    is_high_priority: bool | None = None
    deadline_at: datetime | None = None


class StudySubtopicResponse(StudySubtopicCreate):
    id: int
    user_id: int
    completed_minutes: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudySessionCreate(BaseModel):
    topic_id: int | None = None
    subtopic_id: int | None = None
    title: str
    description: str | None = None
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    planned_minutes: int
    energy_preference: str = "medium"
    session_type: str = "deep_work"


class StudySessionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    planned_minutes: int | None = None
    actual_minutes: int | None = None
    energy_preference: str | None = None
    session_type: str | None = None
    status: str | None = None
    carry_forward_count: int | None = None
    explanation_text: str | None = None


class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    topic_id: int | None
    subtopic_id: int | None
    title: str
    description: str | None
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    planned_minutes: int
    actual_minutes: int | None
    energy_preference: str
    session_type: str
    status: str
    carry_forward_count: int
    explanation_text: str | None

    class Config:
        from_attributes = True


class StudyInsightResponse(BaseModel):
    next_best_topic: str | None
    next_best_subtopic: str | None
    estimated_weekly_coverage_minutes: int
    pending_sessions: int
    missed_sessions: int
    current_streak_days: int
    longest_streak_days: int