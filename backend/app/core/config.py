from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Social Sentiment Analytics"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'sentiment.db'}"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    max_upload_bytes: int = 5 * 1024 * 1024
    max_batch_size: int = 500
    demo_data_path: str = str(BACKEND_DIR.parent / "data" / "sample_social_media.csv")
    model_path: str = str(BACKEND_DIR / "app/ml/artifacts/sentiment_pipeline.joblib")
    metrics_path: str = str(BACKEND_DIR / "app/ml/artifacts/metrics.json")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
