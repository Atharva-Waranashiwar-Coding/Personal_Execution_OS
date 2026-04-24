from pydantic import BaseModel


class FinalAnalyticsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int

    generated_plans: int
    total_plan_items: int
    completed_plan_items: int

    study_sessions_completed: int
    job_active_applications: int
    life_admin_urgent_items: int
    health_weekly_workouts_completed: int

    prompt_runs: int
    total_estimated_llm_cost: float