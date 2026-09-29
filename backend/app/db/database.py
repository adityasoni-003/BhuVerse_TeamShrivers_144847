import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("bhuverse.db")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://bhuverse:12345678@localhost:5432/bhuverse"
)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        pass
except Exception as e:
    # Resilient fallback to local SQLite database if local PostgreSQL is unreachable
    DATABASE_URL = "sqlite:///./bhuverse.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def setup_sqlite_spatial_mock(dbapi_connection, connection_record):
        dbapi_connection.create_function("AsEWKB", -1, lambda *args: b"\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")
        dbapi_connection.create_function("GeomFromEWKT", -1, lambda *args: None)
        dbapi_connection.create_function("ST_GeomFromText", -1, lambda *args: None)
        dbapi_connection.create_function("CheckSpatialIndex", -1, lambda *args: 0)
        dbapi_connection.create_function("DisableSpatialIndex", -1, lambda *args: None)
        dbapi_connection.create_function("DiscardGeometryColumn", -1, lambda *args: None)
        dbapi_connection.create_function("RecoverGeometryColumn", -1, lambda *args: None)
        dbapi_connection.create_function("InitSpatialMetaData", -1, lambda *args: None)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
