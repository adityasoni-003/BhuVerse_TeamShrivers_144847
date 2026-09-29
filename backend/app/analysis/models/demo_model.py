import hashlib
from typing import Union
from PIL import Image
import numpy as np
from app.analysis.models.base_model import BaseWatershedModel, WATERSHED_CLASSES
from app.analysis.schemas.model_result import BoundingBox, ModelPrediction, ModelInferenceResult
from datetime import datetime, timezone

class DemoWatershedModel(BaseWatershedModel):
    """
    Deterministic Watershed Demo Model for development, demonstration, and fallback.
    
    CRITICAL PRINCIPLES:
    - ZERO RANDOM NUMBERS.
    - Completely repeatable and deterministic output based on input image characteristics.
    - Explicitly labeled as 'Demo Inference' mode with model name 'BhuVerse-Demo-Watershed'.
    - Produces domain-appropriate watershed features (Farm Pond, Check Dam, Vegetation, etc.).
    - Never reports generic objects like 'cow', 'car', 'person'.
    """

    def __init__(self):
        super().__init__(
            model_name="BhuVerse-Demo-Watershed",
            inference_mode="Demo Inference"
        )

    def predict(self, image: Union[Image.Image, np.ndarray, str]) -> ModelInferenceResult:
        if isinstance(image, str):
            img = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            img = Image.fromarray(image).convert("RGB")
        elif isinstance(image, Image.Image):
            img = image.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image)}")

        # Resize to fixed thumbnail for deterministic statistical analysis
        sample_img = img.resize((64, 64))
        pixel_data = np.array(sample_img, dtype=np.float32)

        # Calculate deterministic channel statistics
        r_mean = float(np.mean(pixel_data[:, :, 0]))
        g_mean = float(np.mean(pixel_data[:, :, 1]))
        b_mean = float(np.mean(pixel_data[:, :, 2]))
        brightness = (r_mean + g_mean + b_mean) / 3.0

        # Deterministic hash of pixel array bytes for reproducible hash-based metric adjustment
        raw_bytes = pixel_data.tobytes()
        hash_digest = hashlib.sha256(raw_bytes).hexdigest()
        hash_int = int(hash_digest[:8], 16)
        hash_factor = (hash_int % 100) / 1000.0 # 0.000 to 0.099

        # Deterministic watershed classification
        if b_mean > g_mean * 1.02 and b_mean > r_mean * 1.02:
            if brightness > 120:
                detected_label = "Water Body"
                desc = "Demo Inference: Surface water spectral characteristics identified."
            else:
                detected_label = "Farm Pond"
                desc = "Demo Inference: Ground water catchment / farm pond signature identified."
            base_conf = 0.88
            bbox = BoundingBox(ymin=0.15, xmin=0.15, ymax=0.85, xmax=0.85)

        elif g_mean > r_mean and g_mean > b_mean:
            if g_mean > (r_mean + b_mean) * 0.65:
                detected_label = "Vegetation"
                desc = "Demo Inference: Strong green vegetation index detected across terrain."
            else:
                detected_label = "Agricultural Land"
                desc = "Demo Inference: Cropland canopy identified."
            base_conf = 0.85
            bbox = BoundingBox(ymin=0.10, xmin=0.10, ymax=0.90, xmax=0.90)

        elif r_mean > b_mean and r_mean > g_mean * 0.95:
            if brightness < 90:
                detected_label = "Check Dam"
                desc = "Demo Inference: Low-reflectance masonry/earthen structure signature characteristic of check dam."
            else:
                detected_label = "Barren / Dry Land"
                desc = "Demo Inference: High-albedo dry soil signature with minimal canopy cover."
            base_conf = 0.82
            bbox = BoundingBox(ymin=0.20, xmin=0.20, ymax=0.80, xmax=0.80)

        elif abs(r_mean - g_mean) < 15 and abs(g_mean - b_mean) < 15:
            if brightness < 110:
                detected_label = "Percolation Tank"
                desc = "Demo Inference: Ground depression / percolation structure signature."
            else:
                detected_label = "Stream / Drainage"
                desc = "Demo Inference: Drainage pathway / seasonal stream corridor detected."
            base_conf = 0.80
            bbox = BoundingBox(ymin=0.25, xmin=0.15, ymax=0.75, xmax=0.85)
        else:
            detected_label = "Canal"
            desc = "Demo Inference: Linear channel feature identified."
            base_conf = 0.79
            bbox = BoundingBox(ymin=0.20, xmin=0.30, ymax=0.80, xmax=0.70)

        # Deterministic confidence (clamped between 0.78 and 0.94)
        final_conf = round(min(0.94, max(0.78, base_conf + hash_factor)), 4)

        prediction = ModelPrediction(
            label=detected_label,
            confidence=final_conf,
            bbox=bbox,
            description=desc
        )

        return ModelInferenceResult(
            predictions=[prediction],
            model_name=self.model_name,
            model_version="demo_v1",
            dataset_name="Watershed Deterministic Demo",
            inference_mode=self.inference_mode,
            classes_trained=WATERSHED_CLASSES,
            timestamp=datetime.now(timezone.utc)
        )
