import uuid
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
# Don't import the real settings
# from app.core.config import settings
from app.models.user import User
from app.models.mindmap import MindMap
from app.models.node import Node
from app.models.vote import Vote

# Create a test database URL (using SQLite for tests)
TEST_DATABASE_URL = "sqlite:///./test.db"

# Create engine and session for testing
engine = create_engine(TEST_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Create tables
from app.core.database import Base
Base.metadata.create_all(bind=engine)

def test_models():
    session = SessionLocal()

    try:
        # Test creating a user
        test_user = User(
            id=uuid.uuid4(),
            username="testuser",
            email="test@example.com",
            hashed_password="hashedpassword123"
        )
        session.add(test_user)
        session.commit()
        print("✓ User created successfully")

        # Test creating a mindmap
        test_mindmap = MindMap(
            name="Test Mindmap",
            owner_id=test_user.id
        )
        session.add(test_mindmap)
        session.commit()
        print("✓ Mindmap created successfully")

        # Test creating a node
        test_node = Node(
            mindmap_id=test_mindmap.id,
            content="Test Node",
            created_by=test_user.id
        )
        session.add(test_node)
        session.commit()
        print("✓ Node created successfully")

        # Test relationships
        user_with_mindmaps = session.get(User, test_user.id)
        print(f"✓ User has {len(user_with_mindmaps.mindmaps)} mindmaps")
        print(f"✓ Mindmap has {len(test_mindmap.nodes)} nodes")

        # Cleanup
        session.delete(test_node)
        session.delete(test_mindmap)
        session.delete(test_user)
        session.commit()
        print("✓ Cleanup completed")

    except Exception as e:
        print(f"✗ Error: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    test_models()