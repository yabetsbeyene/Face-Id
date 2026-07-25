"""
Data-access helpers. Keeps raw SQLAlchemy queries out of the API route files.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Person, RecognitionLog, MatchOutcome


async def create_person(
    db: AsyncSession,
    person_code: str,
    full_name: str,
    faiss_position: int,
    role: str | None = None,
    notes: str | None = None,
    alert_email: str | None = None,
    photo_url: str | None = None,
    person_id: str | None = None,
) -> Person:
    kwargs = dict(
        person_code=person_code,
        full_name=full_name,
        faiss_position=faiss_position,
        role=role,
        notes=notes,
        alert_email=alert_email,
        photo_url=photo_url,
    )
    if person_id is not None:
        kwargs["id"] = person_id
    person = Person(**kwargs)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person

async def get_person_by_faiss_position(db: AsyncSession, position: int) -> Person | None:
    result = await db.execute(select(Person).where(Person.faiss_position == position))
    return result.scalar_one_or_none()


async def get_person_by_id(db: AsyncSession, person_id: str) -> Person | None:
    result = await db.execute(select(Person).where(Person.id == person_id))
    return result.scalar_one_or_none()


async def list_people(db: AsyncSession, limit: int = 200) -> list[Person]:
    result = await db.execute(select(Person).order_by(Person.created_at.desc()).limit(limit))
    return list(result.scalars().all())


async def update_person(db: AsyncSession, person: Person, *, person_code: str | None = None, full_name: str | None = None, role: str | None = None, notes: str | None = None, alert_email: str | None = None) -> Person:
    if person_code is not None:
        person.person_code = person_code
    if full_name is not None:
        person.full_name = full_name
    if role is not None:
        person.role = role
    if notes is not None:
        person.notes = notes
    if alert_email is not None:
        person.alert_email = alert_email

    await db.commit()
    await db.refresh(person)
    return person


async def delete_person(db: AsyncSession, person: Person) -> None:
    await db.delete(person)
    await db.commit()


async def log_recognition(
    db: AsyncSession,
    outcome: MatchOutcome,
    person_id: str | None = None,
    similarity_score: float | None = None,
) -> RecognitionLog:
    log = RecognitionLog(person_id=person_id, outcome=outcome, similarity_score=similarity_score)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def list_recent_logs(db: AsyncSession, limit: int = 50) -> list[RecognitionLog]:
    result = await db.execute(
        select(RecognitionLog).order_by(RecognitionLog.timestamp.desc()).limit(limit)
    )
    return list(result.scalars().all())
