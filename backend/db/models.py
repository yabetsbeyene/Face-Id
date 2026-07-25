"""
ORM models.

Design note: we do NOT store the 512-d embedding vector in Postgres.
The vector lives only in the FAISS index; Postgres stores `faiss_position`,
the row number of that vector inside the index, so a FAISS search result
(an index position) can be resolved back to a person record.
"""
import datetime
import enum
import uuid

from sqlalchemy import String, Integer, DateTime, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


class Person(Base):
    __tablename__ = "people"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_code: Mapped[str] = mapped_column(String, unique=True, index=True)  # e.g. "48520391"
    full_name: Mapped[str] = mapped_column(String)
    role: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "employee", "visitor"
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    alert_email: Mapped[str | None] = mapped_column(String, nullable=True)

    # Position of this person's embedding inside the FAISS index.
    faiss_position: Mapped[int] = mapped_column(Integer, unique=True, index=True)

    # Relative URL path to a photo/avatar, e.g. "/static/people/<uuid>.jpg".
    # Real enrollments get their actual uploaded photo; synthetic seed data
    # gets a generated initials avatar so it's visually obvious which is which.
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=lambda: datetime.datetime.utcnow()
    )

    logs: Mapped[list["RecognitionLog"]] = relationship(back_populates="person")


class MatchOutcome(str, enum.Enum):
    MATCHED = "matched"
    NO_MATCH = "no_match"


class RecognitionLog(Base):
    """One row per recognition attempt -- powers the Logs page in the dashboard."""

    __tablename__ = "recognition_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True)
    outcome: Mapped[MatchOutcome] = mapped_column(SAEnum(MatchOutcome))
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=lambda: datetime.datetime.utcnow(), index=True
    )

    person: Mapped["Person | None"] = relationship(back_populates="logs")
