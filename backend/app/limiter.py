from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.jwt import decode_access_token


def _get_user_or_ip(request: Request) -> str:
    """Rate-limit by authenticated user ID, falling back to IP."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_access_token(auth[7:])
        if payload and payload.get("sub"):
            return f"user:{payload['sub']}"
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_or_ip)
