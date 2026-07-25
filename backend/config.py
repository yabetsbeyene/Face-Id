"""
Centralized configuration for the app.
Everything that varies between dev/hackathon-demo/prod lives here,
loaded from environment variables (see .env.example).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://faceid:faceid@localhost:5432/faceid_db"

    # FAISS index
    faiss_index_path: str = "faiss_index/data/faiss.index"
    faiss_id_map_path: str = "faiss_index/data/id_map.json"
    embedding_dim: int = 512

# Recognition behavior
    match_threshold: float = 0.42  # cosine similarity cutoff -- tuned for live webcam
                                   # (lower than static photo because JPEG+WS compression
                                   # reduces similarity by ~0.08-0.15 vs. enrollment photo)

    # Image quality gating.
    # For enrollment (POST /enroll): these are hard gates -- a bad enrollment
    # photo permanently degrades the FAISS vector, so we reject it up-front.
    # For live stream (WS /ws/recognize): these are SOFT -- the system will
    # enhance the frame and attempt recognition anyway; quality issues are
    # reported as metadata only.
    min_detection_confidence: float = 0.45  # slightly relaxed for webcam angles
    min_blur_variance: float = 40.0         # after enhancement, many frames recover
    min_face_width_px: int = 60             # smaller face = further from camera
    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    # Email alerts. SMTP_PASSWORD should normally be an app password.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    default_alert_email: str = ""
    email_alert_cooldown_seconds: int = 300

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Singleton settings instance, import this everywhere else
settings = Settings()
