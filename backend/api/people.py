"""
GET /people
Lists enrolled people for the dashboard's Person Directory. Read-only --
enrollment happens through POST /enroll, this just powers the listing UI.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import crud
from db.database import get_db
from schemas.person import PersonOut

router = APIRouter()


@router.get("", response_model=list[PersonOut])
async def list_people(db: AsyncSession = Depends(get_db)):
    people = await crud.list_people(db)
    return [PersonOut.model_validate(p) for p in people]