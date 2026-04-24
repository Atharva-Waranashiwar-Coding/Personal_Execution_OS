from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AICommandRevision(Base):
    __tablename__ = "ai_command_revisions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    command_id: Mapped[int] = mapped_column(ForeignKey("ai_commands.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    revision_message: Mapped[str] = mapped_column(Text, nullable=False)
    previous_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    revised_state: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)