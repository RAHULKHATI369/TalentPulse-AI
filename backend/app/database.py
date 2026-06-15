from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Determine connection configuration with auto-fallback to SQLite for local development
db_url = settings.database_url

try:
    # Try connecting to the configured database
    engine = create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True
    )
    # Perform a quick connection test
    with engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("SELECT 1"))
except Exception as e:
    # Database connection failed (e.g. MariaDB container is offline). Fall back to SQLite.
    sqlite_url = "sqlite:///./talentpulse.db"
    import sys
    print(f"WARNING: Database connection failed: {e}", file=sys.stderr)
    print(f"Falling back to local SQLite instance at: {sqlite_url}", file=sys.stderr)
    db_url = sqlite_url
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency injection yield structure for DB session handling."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
