import os
import json
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class ModelMetadata(BaseModel):
    """
    Standardized Metadata Schema for Trained BhuVerse Watershed Models.
    Ensures complete transparency regarding base model, dataset, dynamic classes,
    training hyperparameters, system environment, and evaluation metrics.
    """
    model_name: str = Field(default="BhuVerse Custom Watershed YOLO")
    model_version: str = Field(default="watershed_v1")
    base_checkpoint: str = Field(default="yolov8n.pt")
    framework: str = Field(default="Ultralytics YOLO")
    dataset_name: str = Field(default="custom_watershed")
    dataset_yaml: str = Field(default="")
    classes: Dict[int, str] = Field(default_factory=dict, description="Dynamic mapping of class ID (int) -> Class Name (str)")
    num_classes: int = Field(default=0)
    image_size: int = Field(default=640)
    epochs_trained: int = Field(default=0)
    trained_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    training_device: str = Field(default="auto")
    random_seed: Optional[int] = Field(default=42)
    system_info: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    weights_file: str = Field(default="best.pt")

    @classmethod
    def create(
        cls,
        model_name: str,
        model_version: str,
        base_checkpoint: str,
        dataset_name: str,
        dataset_yaml: str,
        classes: Dict[int, str],
        image_size: int,
        epochs_trained: int,
        training_device: str,
        metrics: Optional[Dict[str, Any]] = None,
        weights_file: str = "best.pt",
        random_seed: int = 42
    ) -> "ModelMetadata":
        import torch
        import ultralytics

        sys_info = {
            "python_version": sys.version.split()[0],
            "torch_version": torch.__version__,
            "ultralytics_version": ultralytics.__version__,
            "cuda_available": torch.cuda.is_available(),
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
        }

        # Normalize classes dict keys to int
        normalized_classes = {int(k): str(v) for k, v in classes.items()}

        return cls(
            model_name=model_name,
            model_version=model_version,
            base_checkpoint=base_checkpoint,
            dataset_name=dataset_name,
            dataset_yaml=dataset_yaml,
            classes=normalized_classes,
            num_classes=len(normalized_classes),
            image_size=image_size,
            epochs_trained=epochs_trained,
            trained_at=datetime.now(timezone.utc).isoformat(),
            training_device=training_device,
            random_seed=random_seed,
            system_info=sys_info,
            metrics=metrics or {},
            weights_file=weights_file
        )

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2))

    @classmethod
    def load(cls, filepath: str) -> "ModelMetadata":
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Metadata file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Support keys converted to str during JSON serialization
            if "classes" in data and isinstance(data["classes"], dict):
                data["classes"] = {int(k): str(v) for k, v in data["classes"].items()}
            return cls(**data)
