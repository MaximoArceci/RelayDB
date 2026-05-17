from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_env: str = "local"
    cors_origins_raw: str = Field(default="http://localhost:3001,http://localhost:3000", validation_alias="CORS_ORIGINS")
    state_path: str = "/switchbase-state/environments.json"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_prefix="")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


settings = Settings()
