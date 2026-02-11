from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.limiter import limiter
from app.db.engine import get_session
from app.db.models import Organization, User
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.auth.dependencies import CurrentUser
from app.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleOAuthRequest,
    AuthResponse,
    UserResponse,
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
