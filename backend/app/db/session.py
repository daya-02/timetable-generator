"""
Database session management.
Provides SQLAlchemy engine and session factory.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, StaticPool
from typing import Generator

from app.core.config import get_settings

settings = get_settings()

# Get Database URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Fix for Render/PostgreSQL: SQLAlchemy 1.4+ removed support for 'postgres://'
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Handle SQLite vs PostgreSQL connection args
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    is_in_memory_sqlite = (
        SQLALCHEMY_DATABASE_URL in {"sqlite://", "sqlite:///:memory:"}
        or SQLALCHEMY_DATABASE_URL.endswith(":memory:")
    )

    # File-based SQLite should not use StaticPool in concurrent API usage.
    # StaticPool is safe for in-memory SQLite tests only.
    sqlite_pool = StaticPool if is_in_memory_sqlite else NullPool

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=sqlite_pool
    )
    
    # Enable Foreign Key support in SQLite
    from sqlalchemy import event
    from sqlalchemy.engine import Engine
    
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        # Check if we are using SQLite using the connection string
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")       # WAL mode for concurrent reads
            cursor.execute("PRAGMA synchronous=NORMAL")     # Faster writes, still safe
            cursor.execute("PRAGMA cache_size=-8000")       # 8MB cache
            cursor.execute("PRAGMA temp_store=MEMORY")      # Temp tables in memory
            cursor.close()
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
