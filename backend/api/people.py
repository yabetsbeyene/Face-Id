"""
GET /people
Lists enrolled people for the dashboard's Person Directory.
Supports updating and deleting people records from the directory UI.
"""
import os

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db import crud
from db.database import get_db
from schemas.person import PersonOut, PersonUpdate

router = APIRouter()

PEOPLE_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "people")


@router.get("", response_model=list[PersonOut])
async def list_people(db: AsyncSession = Depends(get_db)):
    people = await crud.list_people(db)
    return [PersonOut.model_validate(p) for p in people]


@router.put("/{person_id}", response_model=PersonOut)
async def update_person(person_id: str, payload: PersonUpdate, db: AsyncSession = Depends(get_db)):
    person = await crud.get_person_by_id(db, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")

    cleaned_full_name = payload.full_name.strip() if payload.full_name is not None else None
    cleaned_person_code = payload.person_code.strip() if payload.person_code is not None else None
    cleaned_role = payload.role.strip() if payload.role is not None else None
    cleaned_notes = payload.notes.strip() if payload.notes is not None else None
    cleaned_alert_email = payload.alert_email.strip().lower() if payload.alert_email is not None else None

    updated_person = await crud.update_person(
        db,
        person,
        person_code=cleaned_person_code,
        full_name=cleaned_full_name,
        role=cleaned_role,
        notes=cleaned_notes,
        alert_email=cleaned_alert_email,
    )
    return PersonOut.model_validate(updated_person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(person_id: str, db: AsyncSession = Depends(get_db)):
    person = await crud.get_person_by_id(db, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")

    if person.photo_url:
        filename = os.path.basename(person.photo_url)
        photo_path = os.path.join(PEOPLE_PHOTOS_DIR, filename)
        if os.path.exists(photo_path):
            os.remove(photo_path)

    await crud.delete_person(db, person)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
