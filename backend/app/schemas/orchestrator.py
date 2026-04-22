from datetime import datetime
from pydantic import BaseModel, Field


class ConstraintSignal(BaseModel):
    signal_type: str
    value: str
    source: str


class CandidateItem(BaseModel):
    source_agent: str
    item_type: str
    title: str
    description: str | None = None

    suggested_start_at: datetime | None = None
    suggested_end_at: datetime | None = None

    priority_score: float = 0.0
    urgency_score: float = 0.0
    feasibility_score: float = 0.0

    reference_type: str | None = None
    reference_id: int | None = None
    reasoning: str | None = None


class AgentInput(BaseModel):
    user_id: int
    now: datetime
    timezone: str
    incomplete_tasks: list[dict] = Field(default_factory=list)
    deadlines: list[dict] = Field(default_factory=list)
    calendar_placeholders: list[dict] = Field(default_factory=list)
    constraints: list[ConstraintSignal] = Field(default_factory=list)


class AgentOutput(BaseModel):
    agent_name: str
    summary: str
    candidate_items: list[CandidateItem] = Field(default_factory=list)


class GeneratedPlanItemResponse(BaseModel):
    id: int
    source_agent: str
    item_type: str
    title: str
    description: str | None
    recommended_start_at: datetime | None
    recommended_end_at: datetime | None
    priority_score: float
    urgency_score: float
    feasibility_score: float
    final_score: float
    rank_position: int | None
    status: str
    reference_type: str | None
    reference_id: int | None
    reasoning: str | None

    class Config:
        from_attributes = True


class PlanBriefResponse(BaseModel):
    id: int
    brief_date: datetime
    summary: str
    context_snapshot: str | None
    planning_notes: str | None
    created_by: str
    created_at: datetime
    items: list[GeneratedPlanItemResponse] = Field(default_factory=list)


class GeneratePlanResponse(BaseModel):
    brief_id: int
    summary: str
    item_count: int


class PlanFeedbackCreate(BaseModel):
    feedback_type: str
    note: str | None = None


class PlanFeedbackResponse(BaseModel):
    id: int
    plan_item_id: int
    user_id: int
    feedback_type: str
    note: str | None

    class Config:
        from_attributes = True