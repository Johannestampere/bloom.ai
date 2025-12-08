# middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
import jwt
import os
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models import User

security = HTTPBearer()


class AuthMiddleware:
    def __init__(self):
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

    async def get_current_user(
            self,
            token: str = Depends(security),
            db: Session = Depends(get_db)
    ) -> str:
        """
        Verify Supabase JWT token and return user_id
        """
        try:
            # Decode JWT token from Supabase
            payload = jwt.decode(
                token.credentials,
                self.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )

            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: no user ID found"
                )

            # Check if the user exists in database
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            return user_id

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )


# Create a singleton instance
auth = AuthMiddleware()


async def get_current_user_id(
        token: str = Depends(security),
        db: Session = Depends(get_db)
) -> str:
    return await auth.get_current_user(token, db)

# Dependency to use in routes to return the current user object
async def get_current_user(
        token: str = Depends(security),
        db: Session = Depends(get_db)
) -> User:
    user_id = await auth.get_current_user(token, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user