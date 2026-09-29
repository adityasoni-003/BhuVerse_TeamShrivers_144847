import exifread
from PIL import Image
import os
from typing import Tuple, Optional
from datetime import datetime

def _convert_to_degrees(value) -> float:
    """Helper function to convert the GPS coordinates stored in the EXIF to degress in float format"""
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

def extract_gps_info(file_path: str) -> Tuple[Optional[float], Optional[float], Optional[datetime]]:
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f)

        lat = None
        lon = None
        capture_date = None

        if 'GPS GPSLatitude' in tags and 'GPS GPSLatitudeRef' in tags:
            lat = _convert_to_degrees(tags['GPS GPSLatitude'])
            if tags['GPS GPSLatitudeRef'].values[0] != 'N':
                lat = 0 - lat
                
        if 'GPS GPSLongitude' in tags and 'GPS GPSLongitudeRef' in tags:
            lon = _convert_to_degrees(tags['GPS GPSLongitude'])
            if tags['GPS GPSLongitudeRef'].values[0] != 'E':
                lon = 0 - lon

        if 'Image DateTime' in tags:
            date_str = str(tags['Image DateTime'])
            try:
                capture_date = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
            except ValueError:
                pass

        return lat, lon, capture_date
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
        return None, None, None

def analyze_image_demo(file_path: str) -> list:
    """
    Demo image analysis returning fake deterministic observation.
    """
    return [
        {
            "asset_type": "water_body",
            "confidence": 0.92,
            "description": "Detected surface water from demo model."
        }
    ]
