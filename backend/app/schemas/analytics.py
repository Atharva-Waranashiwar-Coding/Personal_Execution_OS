from pydantic import BaseModel


class AnalyticsSummaryResponse(BaseModel):
    completion_rate: float
    overdue_count: int
    plan_adherence_rate: float
    total_tasks: int
    completed_tasks: int
    generated_plan_count: int
    useful_feedback_count: int
    ignored_feedback_count: int
    unrealistic_feedback_count: int
    completed_feedback_count: int