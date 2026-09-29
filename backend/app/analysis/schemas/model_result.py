# BhuVerse AI Analysis Schemas
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone

class BoundingBox(BaseModel):
    ymin: float = Field(..., ge=0.0, le=1.0, description="Normalized Top coordinate [0, 1]")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Normalized Left coordinate [0, 1]")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Normalized Bottom coordinate [0, 1]")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Normalized Right coordinate [0, 1]")

    def to_list(self) -> List[float]:
        return [self.ymin, self.xmin, self.ymax, self.xmax]

class ModelPrediction(BaseModel):
    label: str = Field(..., description="Detected watershed feature/asset name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model prediction confidence score")
    bbox: Optional[BoundingBox] = Field(None, description="Normalized bounding box of the detected feature")
    description: Optional[str] = Field(None, description="Human-readable summary of detection")

class ModelInferenceResult(BaseModel):
    predictions: List[ModelPrediction]
    model_name: str = Field(..., description="Name of the inference model")
    model_version: Optional[str] = Field("v1.0", description="Trained model version or run ID")
    dataset_name: Optional[str] = Field(None, description="Name/version of dataset model was trained on")
    inference_mode: str = Field(..., description="'demo' or 'real'")
    classes_trained: Optional[List[str]] = Field(default_factory=list, description="List of dynamic classes the model was trained on")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of inference")
