from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GmailActionItem(Base):
    __tablename__ = "gmail_action_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    gmail_message_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    sender: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    extracted_title: Mapped[str] = mapped_column(String(255), nullable=False)
    extracted_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_deadline_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="pending_approval", nullable=False)
    approval_id: Mapped[int | None] = mapped_column(ForeignKey("approvals.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)