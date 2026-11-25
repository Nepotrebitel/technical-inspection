from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_INSECURE_KEY = "change-me-to-very-long-random-secret-key-2026"


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./tehplus_rf.db"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    admin_api_key: str = DEFAULT_INSECURE_KEY

    max_bookings_per_slot: int = 2

    smtp_enabled: bool = False
    smtp_host: str = "smtp.yandex.ru"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_to: str = ""

    max_bot_enabled: bool = False
    max_api_url: str = "https://platform-api.max.ru/messages"
    max_bot_token: str = ""
    max_chat_id: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env == "production":
            if self.admin_api_key == DEFAULT_INSECURE_KEY or len(self.admin_api_key.strip()) < 24:
                raise ValueError(
                    "КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: В режиме production запрещено использовать "
                    "стандартный или короткий ADMIN_API_KEY (минимум 24 символа)."
                )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()