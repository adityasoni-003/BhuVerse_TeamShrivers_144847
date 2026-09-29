import os
import json
import logging
from typing import Union, Optional, Dict
from PIL import Image
try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    YOLO = None
    HAS_ULTRALYTICS = False

from app.analysis.models.base_model import BaseWatershedModel, WATERSHED_CLASSES, GENERIC_COCO_CLASSES, IncompatibleModelError
from app.analysis.schemas.model_result import BoundingBox, ModelPrediction, ModelInferenceResult
from app.training.metadata import ModelMetadata
from datetime import datetime, timezone


logger = logging.getLogger("bhuverse.real_model")

class RealWatershedModel(BaseWatershedModel):
    """
    Trained Custom YOLO Watershed Model Wrapper.
    Performs authentic object detection inference using fine-tuned weights.
    
    CRITICAL PRINCIPLES:
    - 100% Dynamic Classes loaded from model metadata or YOLO model.names.
    - Validates that the model is genuinely trained for watershed asset detection.
    - Rejects generic COCO models (e.g., models detecting 'cow', 'person', 'car').
    - Inference mode is explicitly 'Real Inference'.
    """

    def __init__(self, weights_path: str, confidence_threshold: Optional[float] = None):
        self.weights_path = os.path.abspath(weights_path)
        # Configurable confidence threshold with env var fallback
        env_conf = os.getenv("WATERSHED_CONFIDENCE_THRESHOLD")
        self.confidence_threshold = float(env_conf) if env_conf else (confidence_threshold or 0.25)
        
        self.model = None
        self.metadata: Optional[ModelMetadata] = None
        self.class_names: Dict[int, str] = {}
        self.model_version = "v1.0"
        self.dataset_name = "Custom Watershed Dataset"

        self._load_metadata()
        self._load_and_validate_weights()

        super().__init__(
            model_name=self.metadata.model_name if self.metadata else f"BhuVerse-Watershed-YOLO",
            inference_mode="Real Inference"
        )

    def _load_metadata(self):
        """Attempts to load metadata.json located in the same directory as weights."""
        meta_path = os.path.join(os.path.dirname(self.weights_path), "metadata.json")
        if os.path.exists(meta_path):
            try:
                self.metadata = ModelMetadata.load(meta_path)
                self.class_names = self.metadata.classes
                self.model_version = self.metadata.model_version
                self.dataset_name = self.metadata.dataset_name
            except Exception as e:
                logger.warning(f"Could not parse model metadata from {meta_path}: {e}")

    def _load_and_validate_weights(self):
        if not HAS_ULTRALYTICS:
            raise IncompatibleModelError("Ultralytics library is not installed in the environment. Falling back to Demo Model.")

        if not os.path.exists(self.weights_path):
            raise FileNotFoundError(f"Model weights file not found: {self.weights_path}")

        self.model = YOLO(self.weights_path)


        # If metadata was not present, extract class names directly from YOLO model.names
        if not self.class_names and hasattr(self.model, "names") and isinstance(self.model.names, dict):
            self.class_names = {int(k): str(v) for k, v in self.model.names.items()}

        # -------------------------------------------------------------
        # MODEL COMPATIBILITY VALIDATION
        # -------------------------------------------------------------
        class_list_lower = [name.lower().strip() for name in self.class_names.values()]
        watershed_set_lower = {w.lower().strip() for w in WATERSHED_CLASSES}

        # Check if model has any genuine watershed classes
        has_watershed_classes = any(c in watershed_set_lower for c in class_list_lower)
        
        # Check if model is predominantly generic COCO classes (e.g. cow, person, car)
        coco_overlap = [c for c in class_list_lower if c in GENERIC_COCO_CLASSES]

        if not has_watershed_classes and len(coco_overlap) > 5:
            err_msg = (
                f"Model at '{self.weights_path}' is an off-the-shelf COCO model containing generic classes "
                f"such as {coco_overlap[:5]} and NO trained watershed asset classes. "
                "It is incompatible with watershed feature identification."
            )
            logger.warning(err_msg)
            raise IncompatibleModelError(err_msg)

    def predict(self, image: Union[Image.Image, np.ndarray, str]) -> ModelInferenceResult:
        if self.model is None:
            raise RuntimeError("Model weights are not loaded.")

        if isinstance(image, str):
            pil_img = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            pil_img = Image.fromarray(image).convert("RGB")
        elif isinstance(image, Image.Image):
            pil_img = image.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image)}")

        # Run authentic YOLO object detection
        results = self.model.predict(pil_img, conf=self.confidence_threshold, verbose=False)
        predictions = []

        if results and len(results) > 0:
            r = results[0]
            if len(r.boxes) > 0:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    label = self.class_names.get(cls_id, r.names.get(cls_id, f"Class_{cls_id}"))
                    
                    # Never report generic animal/vehicle COCO classes as watershed predictions
                    if label.lower().strip() in GENERIC_COCO_CLASSES:
                        continue

                    conf = round(float(box.conf[0]), 4)
                    coords = box.xyxyn[0].tolist() # [xmin, ymin, xmax, ymax]
                    bbox = BoundingBox(
                        ymin=max(0.0, min(1.0, coords[1])),
                        xmin=max(0.0, min(1.0, coords[0])),
                        ymax=max(0.0, min(1.0, coords[3])),
                        xmax=max(0.0, min(1.0, coords[2]))
                    )
                    predictions.append(ModelPrediction(
                        label=label,
                        confidence=conf,
                        bbox=bbox,
                        description=f"Real AI Detection: {label} ({conf:.1%} confidence)"
                    ))

        # If zero valid watershed objects detected above threshold
        if len(predictions) == 0:
            predictions.append(ModelPrediction(
                label="No relevant object detected",
                confidence=0.0,
                bbox=None,
                description=f"No trained watershed class detected above confidence threshold ({self.confidence_threshold:.0%})."
            ))

        return ModelInferenceResult(
            predictions=predictions,
            model_name=self.model_name,
            model_version=self.model_version,
            dataset_name=self.dataset_name,
            inference_mode=self.inference_mode,
            classes_trained=list(self.class_names.values()),
            timestamp=datetime.now(timezone.utc)
        )
