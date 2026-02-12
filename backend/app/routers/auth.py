import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.limiter import limiter
from app.db.engine import get_session
from app.db.models import Organization, User, RevokedToken
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token, decode_access_token
from app.auth.dependencies import CurrentUser
from app.auth.totp import generate_totp_secret, get_totp_uri, verify_totp_code
from app.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleOAuthRequest,
    AuthResponse,
    UserResponse,
    TotpSetupResponse,
    TotpVerifyRequest,
    TotpDisableRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.config import settings
from app.services.audit import log_audit

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
        auth_provider=user.auth_provider,
        totp_enabled=user.totp_enabled,
    )


@router.post("/register", response_model=AuthResponse)
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if not settings.registration_open:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration is currently closed")
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    org = Organization(name=body.organization_name or f"{body.full_name}'s Organization", page_limit=10)
    session.add(org)
    await session.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        auth_provider="credentials",
        full_name=body.full_name,
        role="owner",
        org_id=org.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    await log_audit(session, "register", request, user_id=user.id, org_id=org.id, detail=body.email)
    return AuthResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        await log_audit(session, "login_failed", request, detail=f"{body.email}: bad credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # 2FA gate
    if user.totp_enabled:
        if not body.totp_code:
            await log_audit(session, "login_failed", request, user_id=user.id, org_id=user.org_id, detail=f"{body.email}: 2fa_required")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="2fa_required")
        if not user.totp_secret or not verify_totp_code(user.totp_secret, body.totp_code):
            await log_audit(session, "login_failed", request, user_id=user.id, org_id=user.org_id, detail=f"{body.email}: bad 2FA code")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    token = create_access_token({"sub": str(user.id)})
    await log_audit(session, "login", request, user_id=user.id, org_id=user.org_id, detail=body.email)
    return AuthResponse(access_token=token, user=_user_response(user))


@router.post("/oauth/google", response_model=AuthResponse)
async def google_oauth(request: Request, body: GoogleOAuthRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        org = Organization(name=f"{body.name}'s Organization")
        session.add(org)
        await session.flush()

        user = User(
            email=body.email,
            auth_provider="google",
            full_name=body.name,
            role="owner",
            org_id=org.id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        await log_audit(session, "register", request, user_id=user.id, org_id=user.org_id, detail=f"{body.email} (google)")
    else:
        await log_audit(session, "login", request, user_id=user.id, org_id=user.org_id, detail=f"{body.email} (google)")

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser):
    return _user_response(current_user)


_bearer = HTTPBearer()


@router.post("/logout")
async def logout(
    request: Request,
    current_user: CurrentUser,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token missing jti or exp claim")

    revoked = RevokedToken(
        jti=jti,
        expires_at=datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None),
    )
    session.add(revoked)
    await session.commit()

    await log_audit(session, "logout", request, user_id=current_user.id, org_id=current_user.org_id)
    return {"detail": "Logged out"}


# ── 2FA endpoints ────────────────────────────────────────────────────


@router.post("/2fa/setup", response_model=TotpSetupResponse)
async def totp_setup(request: Request, current_user: CurrentUser, session: AsyncSession = Depends(get_session)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")

    secret = generate_totp_secret()
    current_user.totp_secret = secret
    current_user.totp_enabled = False
    session.add(current_user)
    await session.commit()

    uri = get_totp_uri(secret, current_user.email)
    await log_audit(session, "2fa_setup", request, user_id=current_user.id, org_id=current_user.org_id)
    return TotpSetupResponse(secret=secret, otpauth_uri=uri)


@router.post("/2fa/verify-setup")
async def totp_verify_setup(
    request: Request,
    body: TotpVerifyRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Run /2fa/setup first")
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")

    if not verify_totp_code(current_user.totp_secret, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code")

    current_user.totp_enabled = True
    session.add(current_user)
    await session.commit()
    await log_audit(session, "2fa_enable", request, user_id=current_user.id, org_id=current_user.org_id)
    return {"detail": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def totp_disable(
    request: Request,
    body: TotpDisableRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    if not current_user.password_hash or not verify_password(body.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    if not current_user.totp_secret or not verify_totp_code(current_user.totp_secret, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    session.add(current_user)
    await session.commit()
    await log_audit(session, "2fa_disable", request, user_id=current_user.id, org_id=current_user.org_id)
    return {"detail": "2FA disabled successfully"}


# ── Password reset endpoints ────────────────────────────────────────

logger = logging.getLogger(__name__)


def _password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and user.password_hash:
        token = create_access_token(
            {
                "sub": str(user.id),
                "purpose": "password_reset",
                "pfp": _password_fingerprint(user.password_hash),
            },
            expires_delta=timedelta(hours=1),
        )
        reset_link = f"{settings.frontend_url}/reset-password?token={token}"

        import resend

        resend.api_key = settings.resend_api_key
        try:
            resp = resend.Emails.send({
                "from": "BankRead <no-reply@bankread.ai>",
                "to": [user.email],
                "subject": "Reset your BankRead password",
                "html": (
                    f"<p>Hi {user.full_name},</p>"
                    f'<p>Click the link below to reset your password. It expires in 1 hour.</p>'
                    f'<p><a href="{reset_link}">Reset Password</a></p>'
                    f"<p>If you didn't request this, you can safely ignore this email.</p>"
                ),
            })
            logger.info("Resend response: %s (to: %s)", resp, user.email)
        except Exception:
            logger.exception("Failed to send password reset email")

    # Always return success to prevent email enumeration
    return {"detail": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    payload = decode_access_token(body.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user_id = payload.get("sub")
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    # Verify password fingerprint (ensures one-time use)
    if _password_fingerprint(user.password_hash) != payload.get("pfp"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has already been used")

    user.password_hash = hash_password(body.password)
    session.add(user)
    await session.commit()

    await log_audit(session, "password_reset", request, user_id=user.id, org_id=user.org_id, detail=user.email)
    return {"detail": "Password has been reset successfully"}
