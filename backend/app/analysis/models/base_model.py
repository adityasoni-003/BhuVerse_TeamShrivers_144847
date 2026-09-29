from abc import ABC, abstractmethod
from PIL import Image
from typing import List, Set, Dict, Union
import numpy as np
from app.analysis.schemas.model_result import ModelInferenceResult

WATERSHED_CLASSES = [
    "Farm Pond",
    "Check Dam",
    "Percolation Tank",
    "Canal",
    "Stream / Drainage",
    "Water Body",
    "Agricultural Land",
    "Vegetation",
    "Barren / Dry Land",
    "Other Watershed Feature"
]

GENERIC_COCO_CLASSES: Set[str] = {
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
}

class IncompatibleModelError(Exception):
    """Raised when loaded model weights belong to generic COCO or unrelated non-watershed datasets."""
    pass

class BaseWatershedModel(ABC):
    """
    Abstract Base Class for Watershed Feature Identification Models.
    Allows seamless switching between Demo Model and real trained YOLO/PyTorch/ONNX models.
    """

    def __init__(self, model_name: str, inference_mode: str):
        self.model_name = model_name
        self.inference_mode = inference_mode

    @abstractmethod
    def predict(self, image: Union[Image.Image, np.ndarray, str]) -> ModelInferenceResult:
        """
        Runs inference on the provided preprocessed image.
        
        Args:
            image: PIL Image, numpy array, or path to preprocessed image.
            
        Returns:
            ModelInferenceResult with detected classes, confidence, bboxes, and metadata.
        """
        pass
