import re
import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    full_name: str = Field(max_length=100)
    organization_name: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    totp_code: str | None = None


class GoogleOAuthRequest(BaseModel):
    email: EmailStr
    name: str = Field(max_length=100)
    google_id: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    org_id: uuid.UUID
    auth_provider: str
    totp_enabled: bool = False


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TotpSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class TotpVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TotpDisableRequest(BaseModel):
    password: str = Field(max_length=128)
    code: str = Field(min_length=6, max_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(max_length=128)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v
