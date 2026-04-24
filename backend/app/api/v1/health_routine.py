from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.health_profile import HealthProfile
from app.models.health_recommendation import HealthRecommendation
from app.models.recovery_log import RecoveryLog
from app.models.user import User
from app.models.workout_preference import WorkoutPreference
from app.models.workout_session import WorkoutSession
from app.schemas.health import (
    GenerateWorkoutRequest,
    HealthInsightResponse,
    HealthProfileCreate,
    HealthProfileResponse,
    HealthProfileUpdate,
    HealthRecommendationResponse,
    RecoveryLogCreate,
    RecoveryLogResponse,
    WorkoutPreferenceCreate,
    WorkoutPreferenceResponse,
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
)
from app.services.health_insights import get_health_insights
from app.services.health_recommendations import create_recommendations_from_recovery
from app.services.health_recovery import calculate_recovery_score
from app.services.health_scheduler import generate_workout_session

router = APIRouter()


@router.post("/profile", response_model=HealthProfileResponse, status_code=status.HTTP_201_CREATED)
def create_health_profile(
    payload: HealthProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthProfile:
    existing = db.scalar(select(HealthProfile).where(HealthProfile.user_id == current_user.id))
    if existing:
        raise HTTPException(status_code=400, detail="Health profile already exists")

    profile = HealthProfile(user_id=current_user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile", response_model=HealthProfileResponse)
def get_health_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthProfile:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found")
    return profile


@router.put("/profile", response_model=HealthProfileResponse)
def update_health_profile(
    payload: HealthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthProfile:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/preferences", response_model=WorkoutPreferenceResponse, status_code=status.HTTP_201_CREATED)
def create_workout_preference(
    payload: WorkoutPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutPreference:
    preference = WorkoutPreference(user_id=current_user.id, **payload.model_dump())
    db.add(preference)
    db.commit()
    db.refresh(preference)
    return preference


@router.get("/preferences", response_model=list[WorkoutPreferenceResponse])
def list_workout_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutPreference]:
    preferences = db.scalars(
        select(WorkoutPreference)
        .where(WorkoutPreference.user_id == current_user.id)
        .order_by(WorkoutPreference.priority.desc())
    ).all()
    return list(preferences)


@router.post("/recovery", response_model=RecoveryLogResponse, status_code=status.HTTP_201_CREATED)
def create_recovery_log(
    payload: RecoveryLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecoveryLog:
    score = calculate_recovery_score(payload)

    log = RecoveryLog(
        user_id=current_user.id,
        sleep_hours=payload.sleep_hours,
        soreness_level=payload.soreness_level,
        stress_level=payload.stress_level,
        hydration_level=payload.hydration_level,
        energy_level=payload.energy_level,
        recovery_score=score,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    create_recommendations_from_recovery(db, current_user.id, log)

    return log


@router.get("/recovery", response_model=list[RecoveryLogResponse])
def list_recovery_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecoveryLog]:
    logs = db.scalars(
        select(RecoveryLog)
        .where(RecoveryLog.user_id == current_user.id)
        .order_by(RecoveryLog.logged_at.desc())
    ).all()
    return list(logs)


@router.post("/sessions", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def create_workout_session(
    payload: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    session = WorkoutSession(user_id=current_user.id, **payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[WorkoutSessionResponse])
def list_workout_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutSession]:
    sessions = db.scalars(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.created_at.desc())
    ).all()
    return list(sessions)


@router.put("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def update_workout_session(
    session_id: int,
    payload: WorkoutSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    session = db.scalar(
        select(WorkoutSession).where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("status") == "completed" and update_data.get("actual_minutes") is None:
        update_data["actual_minutes"] = session.planned_minutes

    for key, value in update_data.items():
        setattr(session, key, value)

    db.commit()
    db.refresh(session)
    return session


@router.post("/sessions/generate", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def generate_session(
    payload: GenerateWorkoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    session = generate_workout_session(
        db,
        current_user,
        available_minutes=payload.available_minutes,
        energy_level=payload.energy_level,
    )
    return session


@router.get("/recommendations", response_model=list[HealthRecommendationResponse])
def list_health_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HealthRecommendation]:
    recommendations = db.scalars(
        select(HealthRecommendation)
        .where(HealthRecommendation.user_id == current_user.id)
        .order_by(HealthRecommendation.priority_score.desc())
    ).all()
    return list(recommendations)


@router.get("/insights", response_model=HealthInsightResponse)
def health_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthInsightResponse:
    payload = get_health_insights(db, current_user)
    return HealthInsightResponse(**payload)