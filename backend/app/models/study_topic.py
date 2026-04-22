from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StudyTopic(Base):
    __tablename__ = "study_topics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    interview_track_id: Mapped[int | None] = mapped_column(ForeignKey("interview_tracks.id"), nullable=True, index=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    difficulty: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="not_started", nullable=False)

    backlog_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    priority_weight: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    deadline_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_total_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)