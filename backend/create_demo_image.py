import os
from PIL import Image, ImageDraw
import piexif

def deg_to_dms_rational(deg_float):
    deg = int(abs(deg_float))
    rem = (abs(deg_float) - deg) * 60
    minute = int(rem)
    sec = int((rem - minute) * 60 * 100)
    return ((deg, 1), (minute, 1), (sec, 100))

def create_geotagged_image(filename: str, color: str, lat: float, lon: float, title: str):
    os.makedirs('demo_data/sample_images', exist_ok=True)
    img = Image.new('RGB', (500, 350), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([30, 30, 470, 320], outline="white", width=3)
    draw.text((45, 50), f"BhuVerse Sample: {title}", fill="white")
    draw.text((45, 80), f"Coordinates: {lat:.4f} N, {lon:.4f} E", fill="white")
    draw.text((45, 110), "Watershed Geo-Coded Ground Image", fill="#cbd5e1")

    gps_ifd = {
        piexif.GPSIFD.GPSLatitudeRef: 'N' if lat >= 0 else 'S',
        piexif.GPSIFD.GPSLatitude: deg_to_dms_rational(lat),
        piexif.GPSIFD.GPSLongitudeRef: 'E' if lon >= 0 else 'W',
        piexif.GPSIFD.GPSLongitude: deg_to_dms_rational(lon),
    }

    zeroth_ifd = {
        piexif.ImageIFD.Make: "BhuVerse Camera",
        piexif.ImageIFD.DateTime: "2026:09:29 12:00:00",
    }

    exif_dict = {"0th": zeroth_ifd, "GPS": gps_ifd}
    exif_bytes = piexif.dump(exif_dict)

    file_path = os.path.join('demo_data/sample_images', filename)
    img.save(file_path, "jpeg", exif=exif_bytes)
    print(f"Generated geotagged sample: {file_path} (GPS: {lat}, {lon})")

if __name__ == '__main__':
    create_geotagged_image('demo_farm_pond.jpg', '#1e3a8a', 24.7832, 84.9924, "Farm Pond Water Catchment")
    create_geotagged_image('demo_cropland.jpg', '#15803d', 25.1234, 85.3456, "Agricultural Land Canopy")
    create_geotagged_image('demo_check_dam.jpg', '#78350f', 24.5678, 84.7890, "Check Dam Masonry")
