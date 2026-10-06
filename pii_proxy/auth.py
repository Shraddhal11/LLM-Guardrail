from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, Request

from pii_proxy.db import SessionLocal, DBUser

CLERK_ISSUER = "https://driven-clam-9306.clerk.accounts.dev"
_jwks_client = jwt.PyJWKClient(f"{CLERK_ISSUER}/.well-known/jwks.json", cache_keys=True)


def verify_clerk_token(token: str) -> Dict[str, Any]:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")


def get_claims(request: Request) -> Dict[str, Any]:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    return verify_clerk_token(header[len("Bearer "):].strip())


def get_current_user(claims: Dict[str, Any] = Depends(get_claims)) -> DBUser:
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.clerk_user_id == claims["sub"]).first()
    finally:
        db.close()
    if user is None:
        raise HTTPException(status_code=404, detail="user not registered; call /api/users/sync first")
    return user


def require_admin(user: DBUser = Depends(get_current_user)) -> DBUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")
    return user


def assert_owner_or_admin(user: DBUser, target_user_uuid: Optional[str]) -> None:
    if user.role == "admin":
        return
    if target_user_uuid is None or user.user_uuid != target_user_uuid:
        raise HTTPException(status_code=403, detail="not allowed to view this user")
