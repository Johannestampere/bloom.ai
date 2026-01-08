# middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..models import User

security = HTTPBearer()


class AuthMiddleware:
    def __init__(self) -> None:
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

            payload = jwt.decode(
                encoded_token,
                self.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={
                    "verify_iat": False,
                },
            )

            user_id = payload.get("sub")
            if not isinstance(user_id, str) or not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: no user ID found",
                )

            user = db.query(User).filter(User.id == user_id).first()

            if not user:
                email = payload.get("email") or ""
                meta = payload.get("user_metadata") or {}
                base_username = (
                    meta.get("username")
                    or meta.get("full_name")
                    or email
                    or user_id
                )

                # Ensure username is unique by appending suffix if needed
                username = base_username
                existing = db.query(User).filter(User.username == username).first()
                if existing:
                    # Append short unique suffix from user_id
                    username = f"{base_username} ({user_id[:8]})"

                # Create new user with Supabase user_id as primary key
                user = User(
                    id=user_id,
                    email=email,
                    username=username,
                    hashed_password="supabase-oauth",
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            return str(user.id)

        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(exc)}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}",
            )


auth = AuthMiddleware()


async def get_current_user_id(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> str:
    return await auth.get_current_user(token, db)


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