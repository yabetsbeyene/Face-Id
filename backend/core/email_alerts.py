"""SMTP delivery for confirmed recognition alerts."""
import asyncio
import logging
import smtplib
import time
from email.message import EmailMessage

from config import settings

logger = logging.getLogger(__name__)
_last_sent: dict[str, float] = {}
_cooldown_lock = asyncio.Lock()


async def send_match_alert(
    *,
    person_id: str,
    full_name: str,
    person_code: str,
    role: str | None,
    notes: str | None,
    alert_email: str | None,
    similarity: float,
    source: str,
) -> str:
    """Send one alert per person per cooldown window.

    Returns False when SMTP is unconfigured, no recipient exists, delivery
    fails, or a recent alert for the same person was already sent.
    """
    recipient = (alert_email or settings.default_alert_email).strip()
    if not recipient:
        logger.info("Email alert skipped for %s: no recipient configured", person_id)
        return "no_recipient"
    if (
        not settings.smtp_host
        or not settings.smtp_username
        or not settings.smtp_password
        or not settings.smtp_from_email
    ):
        logger.warning("Email alert skipped: SMTP credentials are not fully configured")
        return "not_configured"

    now = time.monotonic()
    async with _cooldown_lock:
        last_sent = _last_sent.get(person_id, 0)
        if now - last_sent < settings.email_alert_cooldown_seconds:
            return "cooldown"
        # Reserve the cooldown before delivery so concurrent webcam frames
        # cannot generate duplicate messages.
        _last_sent[person_id] = now

    try:
        await asyncio.to_thread(
            _deliver,
            recipient,
            full_name,
            person_code,
            role,
            notes,
            similarity,
            source,
        )
        logger.info("Match alert email sent to %s for person %s", recipient, person_id)
        return "sent"
    except Exception:
        async with _cooldown_lock:
            _last_sent.pop(person_id, None)
        logger.exception("Could not deliver match alert email to %s", recipient)
        return "failed"


def _deliver(
    recipient: str,
    full_name: str,
    person_code: str,
    role: str | None,
    notes: str | None,
    similarity: float,
    source: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = f"URGENT FaceID match: {full_name}"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        "\n".join([
            "CRITICAL WATCHLIST MATCH — HUMAN REVIEW REQUIRED",
            "",
            f"Name: {full_name}",
            f"ID number: {person_code}",
            f"Category: {role or 'Uncategorized'}",
            f"Confidence: {round(similarity * 100)}%",
            f"Detection source: {source}",
            f"Notes: {notes or 'None'}",
            "",
            "This is an automated similarity alert. Verify the identity manually",
            "before taking any action.",
        ])
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
