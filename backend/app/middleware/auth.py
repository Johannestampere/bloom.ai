# middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..models import User

security = HTTPBearer()


class AuthMiddleware:
    def __init__(self) -> None:
        # Use validated config so we know this is a string (or raise at startup)
        self.supabase_jwt_secret: str = settings.SUPABASE_JWT_SECRET

    async def get_current_user(
            self,
        token: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db),
    ) -> str:
        """
        Verify Supabase JWT token and return user_id.
        Auto-provision a User row on first login so collaborators/mindmaps work.
        """
        try:
            encoded_token = token.credentials

            # Decode JWT token from Supabase using the project's JWT secret
            payload = jwt.decode(
                encoded_token,
                self.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

            user_id = payload.get("sub")
            if not isinstance(user_id, str) or not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: no user ID found",
                )

            # Try to load existing user
            user = db.query(User).filter(User.id == user_id).first()

            # Auto-create user on first login
            if not user:
                email = payload.get("email") or ""
                meta = payload.get("user_metadata") or {}
                username = (
                    meta.get("username")
                    or meta.get("full_name")
                    or email
                    or user_id
                )

                user = User(
                    id=user_id,
                    email=email,
                    username=username,
                    # Supabase-managed auth: this field is unused but required.
                    hashed_password="supabase-oauth",
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            return str(user.id)

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(exc)}",
            )
        except Exception as e:
            # Surface a clear error but avoid leaking secrets
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}",
            )


# Create a singleton instance
auth = AuthMiddleware()


async def get_current_user_id(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> str:
    return await auth.get_current_user(token, db)


# Dependency to use in routes to return the current user object
async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    user_id = await auth.get_current_user(token, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user