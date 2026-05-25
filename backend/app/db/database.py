import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Resolve SQLite database in the parent directory of backend app
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_URL = f"sqlite:///{os.path.join(BASE_DIR, 'risk_platform.db')}"

# Read Database URL from environment variables, fallback to SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# For SQLite, we need to pass connect_args={"check_same_thread": False}
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency helper to yield database session and clean up after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
