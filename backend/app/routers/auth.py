from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.limiter import limiter
from app.db.engine import get_session
from app.db.models import Organization, User
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
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
)

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
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    org = Organization(name=body.organization_name or f"{body.full_name}'s Organization")
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
    return AuthResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # 2FA gate
    if user.totp_enabled:
        if not body.totp_code:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="2fa_required")
        if not user.totp_secret or not verify_totp_code(user.totp_secret, body.totp_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user=_user_response(user))


@router.post("/oauth/google", response_model=AuthResponse)
async def google_oauth(body: GoogleOAuthRequest, session: AsyncSession = Depends(get_session)):
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

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser):
    return _user_response(current_user)


# ── 2FA endpoints ────────────────────────────────────────────────────


@router.post("/2fa/setup", response_model=TotpSetupResponse)
async def totp_setup(current_user: CurrentUser, session: AsyncSession = Depends(get_session)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")

    secret = generate_totp_secret()
    current_user.totp_secret = secret
    current_user.totp_enabled = False
    session.add(current_user)
    await session.commit()

    uri = get_totp_uri(secret, current_user.email)
    return TotpSetupResponse(secret=secret, otpauth_uri=uri)


@router.post("/2fa/verify-setup")
async def totp_verify_setup(
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
    return {"detail": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def totp_disable(
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
    return {"detail": "2FA disabled successfully"}
