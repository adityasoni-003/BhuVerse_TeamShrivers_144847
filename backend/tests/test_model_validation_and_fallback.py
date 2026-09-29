import io
import os
import pytest
from PIL import Image

from app.analysis.models.base_model import IncompatibleModelError, WATERSHED_CLASSES
from app.analysis.models.real_model import RealWatershedModel
from app.analysis.models.demo_model import DemoWatershedModel
from app.analysis.models.model_loader import ModelLoader, get_model_service
from app.analysis.services.image_analysis_service import ImageAnalysisService, extract_exif_gps
from app.analysis.services.image_preprocessing import ImagePreprocessor, UnsupportedImageFormatError

def create_synthetic_image(color: str, size=(200, 200)) -> bytes:
    """Helper to create an in-memory JPEG test image."""
    img = Image.new("RGB", size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()

def test_generic_coco_model_rejected_as_incompatible():
    """
    1. Test that loading an off-the-shelf COCO model (like yolov8n with 'cow', 'person')
       raises IncompatibleModelError and is rejected by the watershed pipeline.
    """
    weights_path = "demo_data/models/watershed_weights.pt"
    if os.path.exists(weights_path):
        with pytest.raises(IncompatibleModelError):
            RealWatershedModel(weights_path=weights_path)

def test_model_loader_gracefully_falls_back_on_incompatible_model():
    """
    2. Test that ModelLoader automatically falls back to BhuVerse-Demo-Watershed
       when the model file is incompatible.
    """
    model = get_model_service()
    assert isinstance(model, DemoWatershedModel)
    assert model.model_name == "BhuVerse-Demo-Watershed"
    assert model.inference_mode == "Demo Inference"

def test_demo_fallback_determinism():
    """
    3. Test that the demo fallback produces 100% deterministic, repeatable outputs.
    """
    model = DemoWatershedModel()
    img = Image.open(io.BytesIO(create_synthetic_image("blue")))

    res1 = model.predict(img)
    res2 = model.predict(img)

    assert res1.predictions[0].label == res2.predictions[0].label
    assert res1.predictions[0].confidence == res2.predictions[0].confidence
    assert res1.predictions[0].bbox.to_list() == res2.predictions[0].bbox.to_list()
    assert res1.inference_mode == "Demo Inference"

def test_cow_or_pasture_image_never_returns_cow():
    """
    4. Test that images with fields, pastures, or animals NEVER return generic COCO labels like 'Cow'.
    """
    service = ImageAnalysisService()
    # Green agricultural pasture image
    pasture_img = Image.open(io.BytesIO(create_synthetic_image("#2d5a27")))
    result = service.model_service.predict(pasture_img)

    for pred in result.predictions:
        assert pred.label.lower() != "cow"
        assert pred.label.lower() != "person"
        assert pred.label.lower() != "car"
        assert pred.label in (WATERSHED_CLASSES + ["No relevant object detected"])

def test_pond_image_returns_farm_pond_or_water_body_in_demo_fallback():
    """
    5. Test that a water/pond-like image correctly returns Farm Pond or Water Body in demo fallback.
    """
    service = ImageAnalysisService()
    # Blue water body image
    pond_img = Image.open(io.BytesIO(create_synthetic_image("#1e3a8a")))
    result = service.model_service.predict(pond_img)

    assert len(result.predictions) > 0
    assert result.predictions[0].label in ["Farm Pond", "Water Body"]
    assert result.inference_mode == "Demo Inference"
    assert result.predictions[0].confidence >= 0.75

def test_invalid_image_raises_error():
    """
    6. Test that corrupted or invalid image raises proper error.
    """
    corrupt_data = b"NOT_A_VALID_IMAGE_BYTES"
    with pytest.raises(UnsupportedImageFormatError):
        ImagePreprocessor.validate_and_load(corrupt_data)

def test_api_inference_result_schema():
    """
    7. Test inference result schema compliance.
    """
    service = ImageAnalysisService()
    img = Image.open(io.BytesIO(create_synthetic_image("teal")))
    result = service.model_service.predict(img)

    assert result.model_name == "BhuVerse-Demo-Watershed"
    assert result.inference_mode == "Demo Inference"
    assert len(result.predictions) > 0
    assert result.predictions[0].bbox is not None

def test_gps_extraction_preserves_coordinates():
    """
    8. Test that EXIF extraction and manual GPS coordinates remain completely intact and unchanged.
    """
    sample_img = "demo_data/sample_images/demo_farm_pond.jpg"
    if os.path.exists(sample_img):
        lat, lon, date = extract_exif_gps(sample_img)
        assert lat == pytest.approx(24.7832, 0.001)
        assert lon == pytest.approx(84.9924, 0.001)
