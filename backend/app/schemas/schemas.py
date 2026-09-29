from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SpatialObservationBase(BaseModel):
    asset_type: str
    confidence: float
    bounding_box: Optional[str] = None
    model_name: Optional[str] = "Demo Model"
    inference_mode: Optional[str] = "demo"
    description: Optional[str] = None

class SpatialObservationCreate(SpatialObservationBase):
    pass

class SpatialObservation(SpatialObservationBase):
    id: int
    image_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FieldImageBase(BaseModel):
    filename: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capture_date: Optional[datetime] = None

class FieldImageCreate(FieldImageBase):
    pass

class FieldImage(FieldImageBase):
    id: int
    analysis_id: int
    file_path: str
    observations: List[SpatialObservation] = []

    model_config = ConfigDict(from_attributes=True)

class AnalysisBase(BaseModel):
    title: str
    description: Optional[str] = None

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    id: int
    created_at: datetime
    images: List[FieldImage] = []

    model_config = ConfigDict(from_attributes=True)
