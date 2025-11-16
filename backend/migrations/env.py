import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make sure "app/" is on Python path
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import settings and Base metadata
from app.core.database import settings      # reads .env
from app.core.database import Base

# Import all models -> tables are registered
import app.models.collaborator
import app.models.user
import app.models.mindmap
import app.models.node
import app.models.vote

# Provides access to values within alembic.ini
config = context.config

# Override the URL in alembic.ini with the one from .env
config.set_main_option("sqlalchemy.url", str(settings.DIRECT_URL))

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Link Alembic to Metadata
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations without an engine"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with an engine"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
