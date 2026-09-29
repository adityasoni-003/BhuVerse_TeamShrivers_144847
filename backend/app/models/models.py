from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from geoalchemy2 import Geometry

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    images = relationship("FieldImage", back_populates="analysis")

class FieldImage(Base):
    __tablename__ = "field_images"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"))
    filename = Column(String)
    file_path = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    capture_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(Geometry(geometry_type='POINT', srid=4326, spatial_index=False), nullable=True)
    
    analysis = relationship("Analysis", back_populates="images")
    observations = relationship("SpatialObservation", back_populates="image")

class SpatialObservation(Base):
    __tablename__ = "spatial_observations"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("field_images.id"))
    asset_type = Column(String) # e.g., 'Farm Pond', 'Water Body'
    confidence = Column(Float)
    bounding_box = Column(String, nullable=True)
    model_name = Column(String, default="Demo Model")
    inference_mode = Column(String, default="demo")
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    image = relationship("FieldImage", back_populates="observations")
