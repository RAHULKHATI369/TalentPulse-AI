import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Google AI Studio configuration
    gemini_api_key: str = Field(default="mock_api_key", validation_alias="GEMINI_API_KEY")
    
    # MariaDB Database configuration (SQLAlchemy connection string)
    database_url: str = Field(
        default="mysql+pymysql://talentpulse_user:talentpulse_password@db:3306/talentpulse_db",
        validation_alias="DATABASE_URL"
    )
    
    # FastAPI configurations
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")
    debug: bool = Field(default=True, validation_alias="DEBUG")
    
    # Webhook hook URLs for validation integration
    ml_intern_hook_url: str = Field(default="", validation_alias="ML_INTERN_HOOK_URL")

    # Load from environment variables and optionally a .env file
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
