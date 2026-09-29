import os
import yaml
import torch
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class ModelConfig(BaseModel):
    checkpoint: str = Field(default="yolov8n.pt", description="Base pretrained YOLO checkpoint")
    pretrained: bool = Field(default=True, description="Whether to load pretrained weights (transfer learning)")

class DatasetConfig(BaseModel):
    yaml_path: str = Field(..., description="Path to dataset data.yaml")
    dataset_name: Optional[str] = Field(default="watershed_dataset")

class HyperparametersConfig(BaseModel):
    epochs: int = Field(default=50, ge=1, le=1000)
    image_size: int = Field(default=640, ge=128, le=1280)
    batch_size: int = Field(default=16, ge=1, le=128)
    patience: int = Field(default=15, ge=1)
    lr0: float = Field(default=0.01, ge=0.00001, le=0.1)
    lrf: float = Field(default=0.01, ge=0.00001, le=0.1)
    optimizer: str = Field(default="auto") # "auto", "SGD", "Adam", "AdamW"
    workers: int = Field(default=2, ge=0, le=16)
    seed: int = Field(default=42)

class AugmentationConfig(BaseModel):
    hsv_h: float = Field(default=0.015, description="Image HSV-Hue augmentation")
    hsv_s: float = Field(default=0.5, description="Image HSV-Saturation augmentation")
    hsv_v: float = Field(default=0.4, description="Image HSV-Value augmentation")
    degrees: float = Field(default=0.0, description="Image rotation (+/- deg)")
    fliplr: float = Field(default=0.5, description="Horizontal flip probability")
    flipud: float = Field(default=0.0, description="Vertical flip probability")
    mosaic: float = Field(default=1.0, description="Mosaic augmentation probability")
    mixup: float = Field(default=0.0, description="Mixup augmentation probability")

class OutputConfig(BaseModel):
    project: str = Field(default="runs/bhuverse")
    experiment_name: str = Field(default="watershed_v1")

class TrainingConfig(BaseModel):
    """
    Unified Configuration for BhuVerse Custom YOLO Fine-Tuning.
    """
    model: ModelConfig = Field(default_factory=ModelConfig)
    dataset: DatasetConfig
    training: HyperparametersConfig = Field(default_factory=HyperparametersConfig)
    augmentation: AugmentationConfig = Field(default_factory=AugmentationConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    device: str = Field(default="auto") # "auto", "cuda", "cpu"

    @classmethod
    def load(cls, yaml_path: str) -> "TrainingConfig":
        if not os.path.exists(yaml_path):
            raise FileNotFoundError(f"Training config file not found: {yaml_path}")
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return cls(**data)

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        # Convert pydantic model to dict and dump yaml
        data = self.model_dump()
        with open(filepath, "w", encoding="utf-8") as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    def resolve_device(self) -> str:
        if self.device == "auto":
            return "0" if torch.cuda.is_available() else "cpu"
        elif self.device.lower() in ("cuda", "gpu"):
            return "0" if torch.cuda.is_available() else "cpu"
        return self.device
