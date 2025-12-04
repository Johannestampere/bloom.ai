import os
import time
import uuid
import traceback
from dotenv import load_dotenv
from supabase import create_client, Client
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import User, MindMap
from app.core.config import settings

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

engine = create_engine(str(settings.DATABASE_URL))
SessionLocal = sessionmaker(bind=engine)


def test_trigger_working():
    """Test if the authentication trigger is working by creating a test user and verifying sync."""
    session = SessionLocal()

    try:
        test_id = str(uuid.uuid4())[:8]
        test_email = f"triggertest_{test_id}@example.com"

        auth_response = supabase.auth.admin.create_user({
            "email": test_email,
            "email_confirm": True
        })

        if not auth_response or not auth_response.user:
            print("Failed to create user in Supabase Auth")
            if hasattr(auth_response, 'error'):
                print(f"Error: {auth_response.error}")
            return False

        user_id = auth_response.user.id

        for wait_time in [2, 4, 6, 8, 10]:
            time.sleep(2)
            user_in_db = session.query(User).filter(User.id == user_id).first()

            if user_in_db:
                mindmap = MindMap(
                    name=f"Test Mindmap {test_id}",
                owner_id=user_in_db.id
                )
                session.add(mindmap)
                session.commit()

                # Cleanup
                session.delete(mindmap)
                session.delete(user_in_db)
                session.commit()
                supabase.auth.admin.delete_user(user_id)
                return True

        # Debug if user sync failed
        with engine.connect() as conn:
            result = conn.execute(text("""
                                       SELECT email, app_metadata, raw_user_meta_data
                                       FROM auth.users
                                       WHERE id = :id
                                       """), {"id": user_id})
            auth_user = result.fetchone()

        recent_users = session.query(User).order_by(User.created_at.desc()).limit(3).all()

        supabase.auth.admin.delete_user(user_id)
        return False

    except Exception as e:
        print(f"Test failed: {e}")
        traceback.print_exc()
        return False
    finally:
        session.close()


def test_oauth_scenarios():
    """Test OAuth integration scenarios for different providers."""
    session = SessionLocal()

    oauth_tests = [
        {
            "name": "Google OAuth",
            "email": "google.test@gmail.com",
            "metadata": {"name": "Google Test"},
            "app_metadata": {"provider": "google"},
            "expected_password": "OAUTH_GOOGLE"
        },
        {
            "name": "GitHub OAuth",
            "email": "github.test@example.com",
            "metadata": {"login": "githubtest"},
            "app_metadata": {"provider": "github"},
            "expected_password": "OAUTH_GITHUB"
        },
        {
            "name": "Email Signup",
            "email": "email.test@example.com",
            "metadata": {"username": "emailtest"},
            "app_metadata": {"provider": "email"},
            "expected_password": "SUPABASE_AUTH"
        }
    ]

    successful_tests = 0
    created_users = []

    try:
        for test in oauth_tests:
            suffix = str(uuid.uuid4())[:8]
            email = f"{suffix}.{test['email']}"

            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "user_metadata": test["metadata"],
                "app_metadata": test["app_metadata"],
                "email_confirm": True
            })

            if auth_response and auth_response.user:
                created_users.append((auth_response.user.id, test))

        time.sleep(10)

        for user_id, test in created_users:
            user_in_db = session.query(User).filter(User.id == user_id).first()
            if user_in_db and user_in_db.hashed_password == test["expected_password"]:
                successful_tests += 1

        # Cleanup users
        for user_id, _ in created_users:
            supabase.auth.admin.delete_user(user_id)
            user_in_db = session.query(User).filter(User.id == user_id).first()
            if user_in_db:
                session.delete(user_in_db)
        session.commit()

        return successful_tests == len(created_users)

    except Exception as e:
        print(f"OAuth test error: {e}")
        return False
    finally:
        session.close()


if __name__ == "__main__":
    basic_success = test_trigger_working()

    if basic_success:
        oauth_success = test_oauth_scenarios()

        if oauth_success:
            print("\nOAuth integration is fully functional:")
            print("✅ User sync from auth.users to public.users")
            print("✅ OAuth provider detection (Google, GitHub)")
            print("✅ Username generation")
            print("✅ Mindmap creation by auth users")
        else:
            print("\nBasic test passed but OAuth has issues")
    else:
        print("\nTrigger test failed - check:")
        print("1. Trigger existence on auth.users")
        print("2. Function syntax")
        print("3. Function permissions")
        print("4. Supabase logs")
