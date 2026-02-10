from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mock_mode: bool = True
    anthropic_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    upload_dir: str = "uploads"
    max_file_size_mb: int = 10

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
