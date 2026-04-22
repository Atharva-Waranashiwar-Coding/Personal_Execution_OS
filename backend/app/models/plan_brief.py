from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlanBrief(Base):
    __tablename__ = "plan_briefs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    brief_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    context_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    planning_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[str] = mapped_column(String(100), default="orchestrator", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)