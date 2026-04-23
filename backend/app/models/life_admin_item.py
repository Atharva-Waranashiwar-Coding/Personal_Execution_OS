from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LifeAdminItem(Base):
    __tablename__ = "life_admin_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    item_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)

    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    is_recurring_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurrence_parent_id: Mapped[int | None] = mapped_column(ForeignKey("life_admin_items.id"), nullable=True)

    escalation_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reminder_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    source: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)