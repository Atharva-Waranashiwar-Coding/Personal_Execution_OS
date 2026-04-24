from datetime import datetime
from pydantic import BaseModel


class HealthProfileCreate(BaseModel):
    primary_goal: str = "general_fitness"
    fitness_level: str = "beginner"
    preferred_workout_time: str | None = None
    weekly_workout_target: int = 4
    minimum_session_minutes: int = 30
    ideal_session_minutes: int = 60
    notes: str | None = None


class HealthProfileUpdate(BaseModel):
    primary_goal: str | None = None
    fitness_level: str | None = None
    preferred_workout_time: str | None = None
    weekly_workout_target: int | None = None
    minimum_session_minutes: int | None = None
    ideal_session_minutes: int | None = None
    notes: str | None = None


class HealthProfileResponse(HealthProfileCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class WorkoutPreferenceCreate(BaseModel):
    workout_type: str
    priority: int = 5
    minimum_gap_hours: int = 24
    recovery_window_hours: int = 24
    is_active: bool = True


class WorkoutPreferenceResponse(WorkoutPreferenceCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class WorkoutSessionCreate(BaseModel):
    workout_type: str
    title: str
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    planned_minutes: int
    intensity: str = "medium"
    status: str = "planned"
    notes: str | None = None


class WorkoutSessionUpdate(BaseModel):
    workout_type: str | None = None
    title: str | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    planned_minutes: int | None = None
    actual_minutes: int | None = None
    intensity: str | None = None
    status: str | None = None
    energy_before: int | None = None
    energy_after: int | None = None
    notes: str | None = None


class WorkoutSessionResponse(BaseModel):
    id: int
    user_id: int
    workout_type: str
    title: str
    scheduled_start_at: datetime | None
    scheduled_end_at: datetime | None
    planned_minutes: int
    actual_minutes: int | None
    intensity: str
    status: str
    energy_before: int | None
    energy_after: int | None
    notes: str | None

    class Config:
        from_attributes = True


class RecoveryLogCreate(BaseModel):
    sleep_hours: int | None = None
    soreness_level: int | None = None
    stress_level: int | None = None
    hydration_level: int | None = None
    energy_level: int | None = None
    notes: str | None = None


class RecoveryLogResponse(BaseModel):
    id: int
    user_id: int
    sleep_hours: int | None
    soreness_level: int | None
    stress_level: int | None
    hydration_level: int | None
    energy_level: int | None
    recovery_score: int
    notes: str | None
    logged_at: datetime

    class Config:
        from_attributes = True


class HealthRecommendationResponse(BaseModel):
    id: int
    user_id: int
    recommendation_type: str
    title: str
    description: str | None
    priority_score: int
    status: str
    reference_type: str | None
    reference_id: int | None

    class Config:
        from_attributes = True


class GenerateWorkoutRequest(BaseModel):
    available_minutes: int = 60
    energy_level: int = 7


class HealthInsightResponse(BaseModel):
    recovery_score: int
    recommended_action: str
    weekly_workouts_completed: int
    weekly_workout_target: int
    pending_recommendations: int
    last_workout_type: str | None