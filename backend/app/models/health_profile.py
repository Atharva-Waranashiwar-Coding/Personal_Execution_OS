from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    primary_goal: Mapped[str] = mapped_column(String(100), default="general_fitness", nullable=False)
    fitness_level: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False)
    preferred_workout_time: Mapped[str | None] = mapped_column(String(50), nullable=True)

    weekly_workout_target: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    minimum_session_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    ideal_session_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)