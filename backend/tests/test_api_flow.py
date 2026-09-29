import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.models import Analysis
from sqlalchemy import event

# Set up an in-memory SQLite test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

Base.metadata.create_all(bind=engine)

@pytest.fixture(autouse=True)
def clean_database():
    db = TestingSessionLocal()
    db.query(Analysis).delete()
    db.commit()
    db.close()
    yield

@pytest.fixture
def client():
    return TestClient(app)

def create_test_image_bytes(color="blue", size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_api_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_api_analysis_creation_and_image_upload(client):
    # 1. Create Analysis
    create_res = client.post("/api/v1/analyses/", json={
        "title": "Kosi River Basin Survey",
        "description": "Ground survey for watershed asset identification"
    })
    assert create_res.status_code == 200
    analysis_data = create_res.json()
    analysis_id = analysis_data["id"]
    assert analysis_data["title"] == "Kosi River Basin Survey"

    # 2. Upload Field Image with coordinates
    img_bytes = create_test_image_bytes("blue")
    upload_res = client.post(
        f"/api/v1/analyses/{analysis_id}/upload-image",
        files={"file": ("test_pond.jpg", img_bytes, "image/jpeg")},
        data={"latitude": 25.4321, "longitude": 85.9876}
    )
    assert upload_res.status_code == 200
    uploaded_data = upload_res.json()
    assert uploaded_data["filename"] == "test_pond.jpg"
    assert uploaded_data["latitude"] == 25.4321
    assert uploaded_data["longitude"] == 85.9876
    assert len(uploaded_data["observations"]) > 0
    # 3. Verify Observation model fields
    obs = uploaded_data["observations"][0]
    assert obs["asset_type"] in ["Water Body", "Farm Pond", "No relevant object detected"]
    assert "Inference" in obs["inference_mode"] or obs["inference_mode"] in ["real", "demo"]
    assert obs["confidence"] >= 0.0

def test_api_invalid_image_upload_returns_400(client):
    # 1. Create Analysis
    create_res = client.post("/api/v1/analyses/", json={"title": "Test Corrupt Upload"})
    analysis_id = create_res.json()["id"]

    # 2. Upload corrupted bytes
    corrupt_bytes = b"CORRUPTED_NON_IMAGE_DATA_BYTES"
    upload_res = client.post(
        f"/api/v1/analyses/{analysis_id}/upload-image",
        files={"file": ("corrupt.jpg", corrupt_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 400
    assert "Image validation error" in upload_res.json()["detail"]
