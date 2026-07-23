"""
Pydantic request/response models for the enroll and recognize endpoints.
"""
import datetime

from pydantic import BaseModel, ConfigDict


class PersonOut(BaseModel):
    """A person record as returned to the frontend -- never includes the raw embedding."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_code: str
    full_name: str
    role: str | None = None
    notes: str | None = None
    photo_url: str | None = None
    created_at: datetime.datetime
    

class EnrollResponse(BaseModel):
    person: PersonOut
    faiss_position: int
    detection_confidence: float


class RecognizeResponse(BaseModel):
    matched: bool
    person: PersonOut | None = None
    similarity: float
    message: str