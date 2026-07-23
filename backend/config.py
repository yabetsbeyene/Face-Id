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
    match_threshold: float = 0.55  # cosine similarity cutoff for a "confident" match

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Singleton settings instance, import this everywhere else
settings = Settings()
