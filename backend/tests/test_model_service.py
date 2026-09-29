import io
import pytest
from PIL import Image
import numpy as np

from app.analysis.models.base_model import WATERSHED_CLASSES
from app.analysis.models.demo_model import DemoWatershedModel
from app.analysis.models.model_loader import ModelLoader, get_model_service
from app.analysis.services.image_preprocessing import (
    ImagePreprocessor,
    UnsupportedImageFormatError,
    CorruptImageError
)
from app.analysis.services.image_analysis_service import ImageAnalysisService
from app.analysis.schemas.model_result import ModelInferenceResult

def create_synthetic_image(color: str, size=(200, 200)) -> bytes:
    """Helper to create an in-memory JPEG test image."""
    img = Image.new("RGB", size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()

def test_image_preprocessing_valid():
    """Test valid image loading, conversion, and resizing."""
    img_bytes = create_synthetic_image("green", size=(300, 400))
    loaded_img = ImagePreprocessor.validate_and_load(img_bytes)
    assert loaded_img is not None
    assert loaded_img.size == (300, 400)

    preprocessed = ImagePreprocessor.preprocess_for_inference(loaded_img, target_size=(640, 640))
    assert preprocessed.size == (640, 640)
    assert preprocessed.mode == "RGB"

    normalized = ImagePreprocessor.normalize_array(preprocessed)
    assert isinstance(normalized, np.ndarray)
    assert normalized.shape == (640, 640, 3)
    assert normalized.min() >= 0.0
    assert normalized.max() <= 1.0

def test_image_preprocessing_corrupt_data():
    """Test corrupted or invalid image raises appropriate structured exception."""
    corrupt_bytes = b"NOT_A_VALID_IMAGE_FILE_HEADER_12345"
    with pytest.raises(UnsupportedImageFormatError):
        ImagePreprocessor.validate_and_load(corrupt_bytes)

def test_demo_model_determinism_strict():
    """
    CRITICAL TEST:
    Same image input MUST return the EXACT same output every single time.
    No randomness allowed.
    """
    model = DemoWatershedModel()
    img_bytes = create_synthetic_image("blue", size=(150, 150))
    img = Image.open(io.BytesIO(img_bytes))

    results = [model.predict(img) for _ in range(10)]

    first_pred = results[0].predictions[0]
    for idx, r in enumerate(results[1:], start=2):
        pred = r.predictions[0]
        assert pred.label == first_pred.label, f"Run {idx} label mismatch"
        assert pred.confidence == first_pred.confidence, f"Run {idx} confidence mismatch"
        assert pred.bbox.to_list() == first_pred.bbox.to_list(), f"Run {idx} bbox mismatch"
        assert "Demo" in r.inference_mode, f"Run {idx} mode mismatch"
        assert r.model_name == "BhuVerse-Demo-Watershed"

def test_demo_model_watershed_classification_diversity():
    """
    Test that distinct image spectra map deterministically to valid watershed features.
    """
    model = DemoWatershedModel()

    # Blue image -> Water body / Pond
    blue_img = Image.open(io.BytesIO(create_synthetic_image("blue")))
    res_blue = model.predict(blue_img)
    assert res_blue.predictions[0].label in ["Water Body", "Farm Pond"]
    assert "Demo" in res_blue.inference_mode

    # Green image -> Vegetation / Agricultural land
    green_img = Image.open(io.BytesIO(create_synthetic_image("green")))
    res_green = model.predict(green_img)
    assert res_green.predictions[0].label in ["Vegetation", "Agricultural Land"]
    assert "Demo" in res_green.inference_mode

    # Brown / Dark red image -> Check Dam / Barren Land
    brown_img = Image.open(io.BytesIO(create_synthetic_image("#8B4513")))
    res_brown = model.predict(brown_img)
    assert res_brown.predictions[0].label in ["Check Dam", "Barren / Dry Land"]
    assert "Demo" in res_brown.inference_mode

def test_model_loader_fallback():
    """
    Test that ModelLoader safely falls back to DemoWatershedModel
    when weights file does not exist or is incompatible, without crashing.
    """
    model = ModelLoader.get_model(weights_path="non_existent_path_to_weights.pt")
    assert isinstance(model, DemoWatershedModel)
    assert "Demo" in model.inference_mode
    assert "BhuVerse-Demo" in model.model_name

def test_model_service_response_schema():
    """
    Test that inference output satisfies the strict Pydantic schema.
    """
    service = ImageAnalysisService()
    img_bytes = create_synthetic_image("teal")
    img = Image.open(io.BytesIO(img_bytes))

    result = service.model_service.predict(img)
    assert isinstance(result, ModelInferenceResult)
    assert len(result.predictions) > 0
    assert result.predictions[0].label in (WATERSHED_CLASSES + ["No relevant object detected"])
    assert 0.0 <= result.predictions[0].confidence <= 1.0
    assert "Inference" in result.inference_mode or result.inference_mode in ["demo", "real"]

def test_geocoding_resolution_no_fake_gps():
    """
    Test that GPS resolution respects manual and EXIF, but never invents fake GPS.
    """
    # Image without EXIF and without manual GPS
    lat, lon, date = ImageAnalysisService.resolve_geocoding("non_existent.jpg", None, None)
    assert lat is None
    assert lon is None
    assert date is None

    # Image with manual GPS
    lat, lon, date = ImageAnalysisService.resolve_geocoding("non_existent.jpg", 23.456, 85.123)
    assert lat == 23.456
    assert lon == 85.123
