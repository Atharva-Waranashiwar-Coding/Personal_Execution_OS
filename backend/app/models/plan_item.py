from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlanItem(Base):
    __tablename__ = "plan_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brief_id: Mapped[int] = mapped_column(ForeignKey("plan_briefs.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    source_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    recommended_start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recommended_end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    priority_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    urgency_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    feasibility_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    rank_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="recommended", nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(nullable=True)

    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)