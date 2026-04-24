from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ResumeVariant(Base):
    __tablename__ = "resume_variants"

    id : Mapped[int] = mapped_column(primary_key=True)
    user_id : Mapped[int] = mapped_column(ForeignKey("users.id"))

    name : Mapped[str] = mapped_column(String(100))
    focus_area : Mapped[str] = mapped_column(String(150))  # backend, fullstack, ml
    version : Mapped[str] = mapped_column(String(50))

    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)