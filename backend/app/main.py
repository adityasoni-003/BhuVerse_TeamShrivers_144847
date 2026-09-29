import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import router as api_router
from app.db.database import engine, Base

# Ensure upload directory exists
os.makedirs("demo_data/uploads", exist_ok=True)

# Create tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Database initialization deferred or failed: {e}")

app = FastAPI(
    title="BhuVerse V2 API",
    description="Backend for BhuVerse SIH Problem Statement 15 - Watershed AI & GIS Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded field images
app.mount("/uploads", StaticFiles(directory="demo_data/uploads"), name="uploads")

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

