from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    topic_id: Mapped[int | None] = mapped_column(ForeignKey("study_topics.id"), nullable=True, index=True)
    subtopic_id: Mapped[int | None] = mapped_column(ForeignKey("study_subtopics.id"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    scheduled_start_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_end_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    energy_preference: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    session_type: Mapped[str] = mapped_column(String(50), default="deep_work", nullable=False)

    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)
    carry_forward_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    explanation_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)