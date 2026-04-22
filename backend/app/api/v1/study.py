from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.interview_track import InterviewTrack
from app.models.study_session import StudySession
from app.models.study_streak import StudyStreak
from app.models.study_subtopic import StudySubtopic
from app.models.study_topic import StudyTopic
from app.models.user import User
from app.schemas.study import (
    InterviewTrackCreate,
    InterviewTrackResponse,
    StudySessionCreate,
    StudySessionResponse,
    StudySessionUpdate,
    StudySubtopicCreate,
    StudySubtopicResponse,
    StudySubtopicUpdate,
    StudyTopicCreate,
    StudyTopicResponse,
    StudyTopicUpdate,
)

router = APIRouter()


@router.post("/tracks", response_model=InterviewTrackResponse, status_code=status.HTTP_201_CREATED)
def create_track(
    payload: InterviewTrackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewTrack:
    track = InterviewTrack(user_id=current_user.id, **payload.model_dump())
    db.add(track)
    db.commit()
    db.refresh(track)
    return track


@router.get("/tracks", response_model=list[InterviewTrackResponse])
def list_tracks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InterviewTrack]:
    tracks = db.scalars(
        select(InterviewTrack)
        .where(InterviewTrack.user_id == current_user.id)
        .order_by(InterviewTrack.created_at.desc())
    ).all()
    return list(tracks)


@router.post("/topics", response_model=StudyTopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: StudyTopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudyTopic:
    if payload.interview_track_id is not None:
        track = db.scalar(
            select(InterviewTrack).where(
                InterviewTrack.id == payload.interview_track_id,
                InterviewTrack.user_id == current_user.id,
            )
        )
        if not track:
            raise HTTPException(status_code=400, detail="Track not found for user")

    topic = StudyTopic(user_id=current_user.id, **payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/topics", response_model=list[StudyTopicResponse])
def list_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StudyTopic]:
    topics = db.scalars(
        select(StudyTopic)
        .where(StudyTopic.user_id == current_user.id)
        .order_by(StudyTopic.created_at.desc())
    ).all()
    return list(topics)


@router.put("/topics/{topic_id}", response_model=StudyTopicResponse)
def update_topic(
    topic_id: int,
    payload: StudyTopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudyTopic:
    topic = db.scalar(
        select(StudyTopic).where(StudyTopic.id == topic_id, StudyTopic.user_id == current_user.id)
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(topic, key, value)

    db.commit()
    db.refresh(topic)
    return topic


@router.post("/subtopics", response_model=StudySubtopicResponse, status_code=status.HTTP_201_CREATED)
def create_subtopic(
    payload: StudySubtopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySubtopic:
    topic = db.scalar(
        select(StudyTopic).where(StudyTopic.id == payload.topic_id, StudyTopic.user_id == current_user.id)
    )
    if not topic:
        raise HTTPException(status_code=400, detail="Topic not found for user")

    subtopic = StudySubtopic(user_id=current_user.id, **payload.model_dump())
    db.add(subtopic)
    db.commit()
    db.refresh(subtopic)
    return subtopic


@router.get("/subtopics", response_model=list[StudySubtopicResponse])
def list_subtopics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StudySubtopic]:
    subtopics = db.scalars(
        select(StudySubtopic)
        .where(StudySubtopic.user_id == current_user.id)
        .order_by(StudySubtopic.created_at.desc())
    ).all()
    return list(subtopics)


@router.put("/subtopics/{subtopic_id}", response_model=StudySubtopicResponse)
def update_subtopic(
    subtopic_id: int,
    payload: StudySubtopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySubtopic:
    subtopic = db.scalar(
        select(StudySubtopic).where(
            StudySubtopic.id == subtopic_id,
            StudySubtopic.user_id == current_user.id,
        )
    )
    if not subtopic:
        raise HTTPException(status_code=404, detail="Subtopic not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subtopic, key, value)

    db.commit()
    db.refresh(subtopic)
    return subtopic


@router.post("/sessions", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySession:
    session = StudySession(user_id=current_user.id, **payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)

    streak = db.scalar(select(StudyStreak).where(StudyStreak.user_id == current_user.id))
    if not streak:
        streak = StudyStreak(user_id=current_user.id)
        db.add(streak)
        db.commit()

    return session


@router.get("/sessions", response_model=list[StudySessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StudySession]:
    sessions = db.scalars(
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.scheduled_start_at.desc())
    ).all()
    return list(sessions)


@router.put("/sessions/{session_id}", response_model=StudySessionResponse)
def update_session(
    session_id: int,
    payload: StudySessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySession:
    session = db.scalar(
        select(StudySession).where(
            StudySession.id == session_id,
            StudySession.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Study session not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)

    db.commit()
    db.refresh(session)
    return session