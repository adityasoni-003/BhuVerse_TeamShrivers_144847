import os
from typing import Tuple, Optional, Dict, Any, List
from datetime import datetime
from PIL import Image
import exifread

from app.analysis.services.image_preprocessing import ImagePreprocessor, ImageProcessingError
from app.analysis.models.model_loader import get_model_service, ModelLoader
from app.analysis.schemas.model_result import ModelInferenceResult

def _convert_to_degrees(value) -> float:
    """Helper function to convert EXIF GPS coordinate ratio into decimal degrees."""
    d0 = value.values[0].num
    d1 = value.values[0].den
    d = float(d0) / float(d1)

    m0 = value.values[1].num
    m1 = value.values[1].den
    m = float(m0) / float(m1)

    s0 = value.values[2].num
    s1 = value.values[2].den
    s = float(s0) / float(s1)

    return d + (m / 60.0) + (s / 3600.0)

def extract_exif_gps(file_path: str) -> Tuple[Optional[float], Optional[float], Optional[datetime]]:
    """
    Extracts GPS Latitude, Longitude, and Capture Date from image EXIF metadata.
    Does NOT invent or fake GPS coordinates.
    """
    if not os.path.exists(file_path):
        return None, None, None

    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        lat = None
        lon = None
        capture_date = None

        if 'GPS GPSLatitude' in tags and 'GPS GPSLatitudeRef' in tags:
            lat = _convert_to_degrees(tags['GPS GPSLatitude'])
            if str(tags['GPS GPSLatitudeRef'].values).upper().startswith('S'):
                lat = -lat
                
        if 'GPS GPSLongitude' in tags and 'GPS GPSLongitudeRef' in tags:
            lon = _convert_to_degrees(tags['GPS GPSLongitude'])
            if str(tags['GPS GPSLongitudeRef'].values).upper().startswith('W'):
                lon = -lon

        # Extract capture timestamp if present
        for date_tag in ['Image DateTime', 'EXIF DateTimeOriginal', 'EXIF DateTimeDigitized']:
            if date_tag in tags:
                date_str = str(tags[date_tag])
                try:
                    capture_date = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                    break
                except ValueError:
                    pass

        return lat, lon, capture_date
    except Exception as e:
        # Graceful return if EXIF cannot be parsed
        return None, None, None

class ImageAnalysisService:
    """
    Core AI Image Analysis Service Orchestrator.
    Combines EXIF metadata extraction, image validation, preprocessing, and model inference.
    """

    def __init__(self, model_service=None):
        self.model_service = model_service or get_model_service()

    def analyze_field_image(self, file_path: str) -> ModelInferenceResult:
        """
        Loads, preprocesses, and executes inference on the given image file.
        """
        # Validate and load original image safely
        raw_img = ImagePreprocessor.validate_and_load(file_path)

        # Preprocess for model (RGB + standard input dimensions)
        preprocessed_img = ImagePreprocessor.preprocess_for_inference(raw_img)

        # Execute model inference
        result = self.model_service.predict(preprocessed_img)

        return result

    @staticmethod
    def resolve_geocoding(
        file_path: str, 
        manual_lat: Optional[float] = None, 
        manual_lon: Optional[float] = None
    ) -> Tuple[Optional[float], Optional[float], Optional[datetime]]:
        """
        Resolves geolocation:
        1. Uses manual coordinates if explicitly provided by user.
        2. Falls back to EXIF GPS extracted from the image.
        3. Returns None if neither is present (NO fake GPS).
        """
        exif_lat, exif_lon, capture_date = extract_exif_gps(file_path)
        
        final_lat = manual_lat if manual_lat is not None else exif_lat
        final_lon = manual_lon if manual_lon is not None else exif_lon

        return final_lat, final_lon, capture_date
