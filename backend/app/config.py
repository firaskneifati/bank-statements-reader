from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mock_mode: bool = True
    anthropic_api_key: str = ""
    allowed_origins: str = "http://localhost:4001"
    database_url: str = ""
    upload_dir: str = "uploads"
    max_file_size_mb: int = 10
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    registration_open: bool = False
    audit_log_enabled: bool = True
    stripe_mode: str = "test"
    stripe_secret_key_test: str = ""
    stripe_secret_key_live: str = ""
    stripe_webhook_secret_test: str = ""
    stripe_webhook_secret_live: str = ""
    stripe_price_starter_test: str = ""
    stripe_price_pro_test: str = ""
    stripe_price_business_test: str = ""
    stripe_price_starter_live: str = ""
    stripe_price_pro_live: str = ""
    stripe_price_business_live: str = ""
    resend_api_key: str = ""
    contact_email: str = ""
    frontend_url: str = "http://localhost:4001"
    image_page_cost_multiplier: float = 3.0
    max_image_dimension: int = 2048
    google_docai_project_id: str = ""
    google_docai_location: str = "us"
    google_docai_processor_id: str = ""
    google_application_credentials: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def docai_enabled(self) -> bool:
        return bool(self.google_docai_project_id and self.google_docai_processor_id)

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def stripe_secret_key(self) -> str:
        if self.stripe_mode == "live":
            return self.stripe_secret_key_live
        return self.stripe_secret_key_test

    @property
    def stripe_webhook_secret(self) -> str:
        if self.stripe_mode == "live":
            return self.stripe_webhook_secret_live
        return self.stripe_webhook_secret_test

    @property
    def stripe_price_starter(self) -> str:
        if self.stripe_mode == "live":
            return self.stripe_price_starter_live
        return self.stripe_price_starter_test

    @property
    def stripe_price_pro(self) -> str:
        if self.stripe_mode == "live":
            return self.stripe_price_pro_live
        return self.stripe_price_pro_test

    @property
    def stripe_price_business(self) -> str:
        if self.stripe_mode == "live":
            return self.stripe_price_business_live
        return self.stripe_price_business_test


settings = Settings()
