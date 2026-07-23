"""
scripts/seed_db.py

Populates the database with sample data, two ways:

1. Fake citizens (no photos needed) -- generates random, valid-shaped
   embeddings, fictional person records, and a generated initials-avatar
   image (like a Slack default avatar) so the dashboard has something to
   show. These records can NEVER be matched by a real face -- the vectors
   aren't derived from any actual photo, and the avatar is deliberately
   not photorealistic so nobody mistakes it for a real enrolled person.

2. Real enrollment from a folder -- runs actual photos through the same
   detector/embedder/FAISS pipeline as the /enroll API endpoint, and
   copies the real photo into the served static directory. Use this for
   the handful of people (you, teammates) who need to be recognizable
   live during the demo.

Usage:
    python scripts/seed_db.py fake --count 30
    python scripts/seed_db.py enroll --folder ./sample_photos --manifest ./sample_photos/manifest.csv

manifest.csv format (header row required):
    filename,person_code,full_name,role,notes
    alice.jpg,P100,Alice Girma,volunteer,
    bekele.jpg,P101,Bekele Tesfaye,staff,

Run from inside backend/ (or anywhere -- the script fixes sys.path itself).
"""
import argparse
import asyncio
import csv
import hashlib
import os
import random
import sys
import uuid

import numpy as np

# Ensures `backend/` (this script's parent directory) is on sys.path, so
# `from config import settings` etc. resolve correctly no matter whether
# you run this as `python scripts/seed_db.py` or `python seed_db.py` from
# inside scripts/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from db import crud
from db.database import AsyncSessionLocal
from faiss_index.index_manager import get_index_manager

PEOPLE_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "people")

# A muted, professional palette -- avatars shouldn't look like a rainbow of user icons.
AVATAR_COLORS = ["#5C6BC0", "#26A69A", "#8D6E63", "#7E57C2", "#5D8AA8", "#78909C"]

FIRST_NAMES = [
    "Abebe", "Almaz", "Bekele", "Chaltu", "Dawit", "Eyerusalem", "Fikru",
    "Genet", "Hana", "Ibrahim", "Kebede", "Liya", "Mulugeta", "Nardos",
    "Samuel", "Tigist", "Yohannes", "Zewditu",
]
LAST_NAMES = [
    "Alemu", "Bekele", "Girma", "Haile", "Kassa", "Mengistu", "Tesfaye",
    "Wolde", "Yimer", "Zerihun",
]
ROLES = ["citizen", "staff", "visitor", "volunteer"]


def _fake_person_code() -> str:
    # Random suffix, not sequential -- so running `fake` multiple times while
    # iterating on your demo never collides with codes from a previous run.
    # Clearly a demo ID, not a real Fayda-format number, on purpose.
    return f"DEMO-{uuid.uuid4().hex[:8].upper()}"


def _generate_avatar(full_name: str) -> str:
    """
    Generates a simple initials-on-circle avatar SVG (like Slack/Gravatar
    defaults) for a fake person -- deliberately NOT a photorealistic face,
    so nobody mistakes it for a real enrolled person. Real /enroll uploads
    always use the actual photo instead of this.
    """
    initials = "".join(part[0].upper() for part in full_name.split()[:2])
    color = AVATAR_COLORS[int(hashlib.md5(full_name.encode()).hexdigest(), 16) % len(AVATAR_COLORS)]

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<circle cx="60" cy="60" r="60" fill="{color}"/>
<text x="60" y="60" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="44" font-weight="600" fill="#ffffff">{initials}</text>
</svg>'''

    os.makedirs(PEOPLE_PHOTOS_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.svg"
    with open(os.path.join(PEOPLE_PHOTOS_DIR, filename), "w") as f:
        f.write(svg)
    return f"/static/people/{filename}"


async def seed_fake(count: int):
    index_manager = get_index_manager()
    rng = np.random.default_rng()

    async with AsyncSessionLocal() as db:
        for i in range(count):
            vec = rng.normal(size=settings.embedding_dim).astype("float32")
            vec = vec / np.linalg.norm(vec)

            position = index_manager.add(vec)
            full_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            avatar_url = _generate_avatar(full_name)

            await crud.create_person(
                db,
                person_code=_fake_person_code(),
                full_name=full_name,
                faiss_position=position,
                role=random.choice(ROLES),
                photo_url=avatar_url,
                notes="Synthetic demo record -- not a real person, not matchable by any real face.",
            )
        print(f"Seeded {count} fake person records. FAISS index now has {index_manager.total} vectors.")


async def seed_from_folder(folder: str, manifest_path: str):
    from core.embedder import get_embedder
    from core.face_detector import get_detector
    import cv2
    import shutil

    detector = get_detector()
    embedder = get_embedder()
    index_manager = get_index_manager()

    with open(manifest_path, newline="") as f:
        rows = list(csv.DictReader(f))

    async with AsyncSessionLocal() as db:
        for row in rows:
            image_path = os.path.join(folder, row["filename"])
            image = cv2.imread(image_path)
            if image is None:
                print(f"  SKIP {row['filename']}: could not read image")
                continue

            faces = detector.detect(image)
            if not faces:
                print(f"  SKIP {row['filename']}: no face detected")
                continue

            embedding = embedder.embed(faces[0].aligned_crop)
            position = index_manager.add(embedding)

            os.makedirs(PEOPLE_PHOTOS_DIR, exist_ok=True)
            ext = os.path.splitext(row["filename"])[1].lower() or ".jpg"
            dest_filename = f"{uuid.uuid4()}{ext}"
            shutil.copy(image_path, os.path.join(PEOPLE_PHOTOS_DIR, dest_filename))
            photo_url = f"/static/people/{dest_filename}"

            try:
                await crud.create_person(
                    db,
                    person_code=row["person_code"],
                    full_name=row["full_name"],
                    faiss_position=position,
                    role=row.get("role") or None,
                    notes=row.get("notes") or None,
                    photo_url=photo_url,
                )
                print(f"  OK   {row['filename']} -> {row['full_name']} ({row['person_code']})")
            except Exception as e:
                await db.rollback()
                print(f"  FAIL {row['filename']}: {e}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    fake_cmd = sub.add_parser("fake", help="Generate fictional person records with no real photos")
    fake_cmd.add_argument("--count", type=int, default=20)

    enroll_cmd = sub.add_parser("enroll", help="Enroll real photos from a folder + manifest CSV")
    enroll_cmd.add_argument("--folder", required=True)
    enroll_cmd.add_argument("--manifest", required=True)

    args = parser.parse_args()

    if args.command == "fake":
        asyncio.run(seed_fake(args.count))
    elif args.command == "enroll":
        asyncio.run(seed_from_folder(args.folder, args.manifest))


if __name__ == "__main__":
    main()