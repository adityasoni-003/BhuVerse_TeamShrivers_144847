from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import shutil
import os
import json

from geoalchemy2.elements import WKTElement
from app.db.database import get_db
from app.models.models import Analysis, FieldImage, SpatialObservation
from app.schemas.schemas import Analysis as AnalysisSchema, AnalysisCreate, FieldImage as FieldImageSchema, FieldImageCreate
from app.analysis.services.image_analysis_service import ImageAnalysisService
from app.analysis.services.image_preprocessing import ImageProcessingError, UnsupportedImageFormatError, CorruptImageError
from app.services.spatial_evidence import SpatialEvidenceService
from app.services.watershed_data import WatershedDataService

router = APIRouter()

UPLOAD_DIR = "demo_data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "BhuVerse V2 AI & GIS Analysis Engine"}

@router.post("/analyses/", response_model=AnalysisSchema)
def create_analysis(analysis: AnalysisCreate, db: Session = Depends(get_db)):
    db_analysis = Analysis(**analysis.model_dump())
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

@router.get("/analyses/", response_model=List[AnalysisSchema])
def read_analyses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    analyses = db.query(Analysis).order_by(Analysis.id.desc()).offset(skip).limit(limit).all()
    return analyses

@router.get("/analyses/{analysis_id}", response_model=AnalysisSchema)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

@router.post("/analyses/{analysis_id}/upload-image", response_model=FieldImageSchema)
async def upload_image(
    analysis_id: int, 
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Resolve Geocoding (Manual GPS or EXIF GPS metadata - NO fake GPS)
    final_lat, final_lon, capture_date = ImageAnalysisService.resolve_geocoding(
        file_path=file_path,
        manual_lat=latitude,
        manual_lon=longitude
    )

    # Store PostGIS geometry if coordinates are present
    location = None
    if final_lat is not None and final_lon is not None:
        try:
            location = WKTElement(f"POINT({final_lon} {final_lat})", srid=4326)
        except Exception:
            location = None

    db_image = FieldImage(
        analysis_id=analysis_id,
        filename=file.filename,
        file_path=file_path,
        latitude=final_lat,
        longitude=final_lon,
        capture_date=capture_date,
        location=location
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)

    # Execute AI Model Analysis Pipeline
    analysis_service = ImageAnalysisService()
    try:
        inference_result = analysis_service.analyze_field_image(file_path)
        for pred in inference_result.predictions:
            bbox_str = json.dumps(pred.bbox.to_list()) if pred.bbox else None
            db_obs = SpatialObservation(
                image_id=db_image.id,
                asset_type=pred.label,
                confidence=pred.confidence,
                bounding_box=bbox_str,
                model_name=inference_result.model_name,
                inference_mode=inference_result.inference_mode,
                description=pred.description
            )
            db.add(db_obs)
        db.commit()
        db.refresh(db_image)
    except (UnsupportedImageFormatError, CorruptImageError, ImageProcessingError) as img_err:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Image validation error: {str(img_err)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI model inference failed: {str(e)}")

    return db_image

@router.get("/analyses/{analysis_id}/spatial-evidence")
def get_spatial_evidence(
    analysis_id: int,
    radius: int = Query(50, description="Buffer radius in meters (25, 50, 100)"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Authoritative spatial evidence endpoint delivering 30m satellite pixel registration,
    spectral indices (NDVI/NDWI/BSI), LULC buffer composition, cross-modal evidence fusion,
    temporal change detection, and watershed topological context.
    """
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    image = analysis.images[0] if analysis.images else None
    lat = image.latitude if image else None
    lon = image.longitude if image else None
    capture_date = image.capture_date if image else None

    # Get primary detected asset
    asset_type = "Unclassified Field Feature"
    confidence = 0.0
    model_name = "BhuVerse Classifier"
    inference_mode = "demo"
    if image and image.observations and len(image.observations) > 0:
        primary_obs = image.observations[0]
        asset_type = primary_obs.asset_type
        confidence = primary_obs.confidence
        model_name = primary_obs.model_name or "BhuVerse Classifier"
        inference_mode = primary_obs.inference_mode or "demo"

    if lat is not None and lon is not None:
        pixel_reg = SpatialEvidenceService.calculate_pixel_registration(lat, lon)
        provenance = SpatialEvidenceService.get_satellite_provenance(lat, lon, capture_date)
        buffer_ev = SpatialEvidenceService.calculate_buffer_evidence(lat, lon, asset_type, radius=radius)
        fusion = SpatialEvidenceService.perform_evidence_fusion(asset_type, confidence, buffer_ev, lat, lon)
        temporal = SpatialEvidenceService.calculate_temporal_change(lat, lon, asset_type)
        watershed = SpatialEvidenceService.get_watershed_context(lat, lon)
        nearby = SpatialEvidenceService.get_nearby_interventions(lat, lon)
        geojson_layers = WatershedDataService.get_watershed_geojson("WS-UP-01", lat, lon)
    else:
        pixel_reg = {
            "satellite_row": "N/A",
            "satellite_col": "N/A",
            "pixel_center_lat": "N/A",
            "pixel_center_lon": "N/A",
            "distance_from_pixel_center_m": "N/A",
            "analysis_grid_step_m": 30.0
        }
        provenance = {
            "source": "SRISHTI-DRISHTI / Satellite Grid",
            "scene_id": "UNREGISTERED",
            "satellite": "Landsat-9 / Sentinel-2",
            "acquisition_date": "N/A",
            "native_resolution": "30m",
            "analysis_resolution": "30m analysis unavailable",
            "analysis_resolution_validated": False,
            "crs": "WGS 84 (EPSG:4326)",
            "temporal_gap_days": 0,
            "coverage": "Unavailable (Missing GPS)"
        }
        buffer_ev = {
            "buffer_radius_m": radius,
            "buffer_area_ha": 0.0,
            "ndvi": {"mean": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0, "status": "No GPS"},
            "ndwi": {"mean": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0, "status": "No GPS"},
            "bsi": {"mean": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0, "status": "No GPS"},
            "lulc": {}
        }
        fusion = {
            "status": "INSUFFICIENT EVIDENCE",
            "badge_class": "badge-insufficient",
            "summary": "This image does not contain valid GPS metadata. Spatial registration cannot be performed.",
            "rule_applied": "RULE-ERR-01: GPS metadata required for 30m satellite evidence integration."
        }
        temporal = None
        watershed = None
        nearby = []
        geojson_layers = None

    return {
        "analysis_id": f"BHU-{analysis.id:08d}",
        "raw_id": analysis.id,
        "title": analysis.title,
        "description": analysis.description,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "field_observation": {
            "asset_type": asset_type,
            "confidence": confidence,
            "model_name": model_name,
            "inference_mode": inference_mode,
            "filename": image.filename if image else None,
            "image_url": f"/uploads/{image.filename}" if image else None,
            "capture_date": image.capture_date.isoformat() if (image and image.capture_date) else None,
            "latitude": lat,
            "longitude": lon,
            "has_gps": lat is not None and lon is not None
        },
        "spatial_registration": pixel_reg,
        "satellite_provenance": provenance,
        "buffer_evidence": buffer_ev,
        "evidence_fusion": fusion,
        "temporal_change": temporal,
        "watershed_context": watershed,
        "nearby_interventions": nearby,
        "geojson_layers": geojson_layers
    }

@router.get("/watersheds")
def get_watersheds() -> List[Dict[str, Any]]:
    return WatershedDataService.get_watersheds_list()

@router.get("/watersheds/{watershed_id}/layers")
def get_watershed_layers(watershed_id: str) -> Dict[str, Any]:
    return WatershedDataService.get_watershed_geojson(watershed_id)

@router.get("/interventions")
def get_interventions() -> List[Dict[str, Any]]:
    return SpatialEvidenceService.get_nearby_interventions(14.6812, 77.6015)

@router.get("/change-detection")
def get_change_detection(watershed_id: Optional[str] = "WS-UP-01") -> Dict[str, Any]:
    return SpatialEvidenceService.calculate_temporal_change(14.6812, 77.6015, "Check Dam")

@router.get("/system/status")
def get_system_status() -> Dict[str, Any]:
    return WatershedDataService.get_system_health()

@router.get("/observations")
def get_all_observations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    results = []
    images = db.query(FieldImage).all()
    for img in images:
        obs = img.observations[0] if img.observations else None
        results.append({
            "id": img.id,
            "analysis_id": img.analysis_id,
            "filename": img.filename,
            "latitude": img.latitude,
            "longitude": img.longitude,
            "capture_date": img.capture_date.isoformat() if img.capture_date else None,
            "asset_type": obs.asset_type if obs else "Unclassified",
            "confidence": obs.confidence if obs else 0.0,
            "status": "SUPPORTED" if (img.latitude and img.longitude) else "NO_GPS"
        })
    return results
