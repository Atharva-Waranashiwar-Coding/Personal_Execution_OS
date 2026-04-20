from pydantic import BaseModel


class AnalyticsSummaryResponse(BaseModel):
    completion_rate: float
    overdue_count: int
    plan_adherence_rate: float
    total_tasks: int
    completed_tasks: int