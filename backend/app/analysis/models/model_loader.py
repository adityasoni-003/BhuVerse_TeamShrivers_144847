import os
import logging
from typing import Optional, List, Dict, Any
from app.analysis.models.base_model import BaseWatershedModel, IncompatibleModelError
from app.analysis.models.demo_model import DemoWatershedModel
from app.analysis.models.real_model import RealWatershedModel
from app.training.metadata import ModelMetadata

logger = logging.getLogger("bhuverse.model_loader")

class ModelLoader:
    """
    Model Loader & Registry Abstraction.
    Resolves active model service:
    1. Attempts to load valid custom-trained watershed model.
    2. Validates model classes (rejects generic COCO models like cow/person).
    3. If incompatible or missing, falls back cleanly to deterministic Demo Inference.
    """

    @classmethod
    def get_model(
        cls, 
        weights_path: Optional[str] = None, 
        version: Optional[str] = None, 
        force_demo: bool = False
    ) -> BaseWatershedModel:
        if force_demo:
            logger.info("Demo mode explicitly requested. Loading BhuVerse-Demo-Watershed.")
            return DemoWatershedModel()

        # 1. If explicit version requested from models/<version>/
        if version:
            version_weights = os.path.join("models", version, "best.pt")
            if os.path.exists(version_weights):
                try:
                    return RealWatershedModel(weights_path=version_weights)
                except IncompatibleModelError as ime:
                    logger.warning(f"Model version '{version}' is incompatible: {ime}. Falling back to Demo Inference.")
                    return DemoWatershedModel()

        # 2. Check explicit path or env var or default path
        path = weights_path or os.getenv("WATERSHED_MODEL_PATH", "demo_data/models/watershed_weights.pt")
        
        if os.path.exists(path):
            try:
                model = RealWatershedModel(weights_path=path)
                logger.info(f"Loaded compatible Real Watershed Model from '{path}' (Classes: {list(model.class_names.values())[:5]}...)")
                return model
            except IncompatibleModelError as ime:
                logger.warning(
                    f"Model validation notice: {ime} "
                    "Automatically activating BhuVerse-Demo-Watershed (Demo Inference)."
                )
                return DemoWatershedModel()
            except Exception as e:
                logger.warning(f"Could not initialize model from '{path}' ({e}). Falling back to Demo Inference.")
                return DemoWatershedModel()
        
        # 3. Default fallback when no weights file exists
        logger.info("No trained watershed weights file found. Initializing BhuVerse-Demo-Watershed (Demo Inference).")
        return DemoWatershedModel()

    @classmethod
    def list_registered_models(cls) -> List[Dict[str, Any]]:
        """Scans the models/ directory and returns all versioned trained models with their metadata."""
        registered = []
        base_dir = "models"
        if not os.path.exists(base_dir):
            return registered

        for entry in os.listdir(base_dir):
            entry_path = os.path.join(base_dir, entry)
            if os.path.isdir(entry_path):
                weights_path = os.path.join(entry_path, "best.pt")
                meta_path = os.path.join(entry_path, "metadata.json")
                if os.path.exists(weights_path):
                    meta_dict = {}
                    if os.path.exists(meta_path):
                        try:
                            m = ModelMetadata.load(meta_path)
                            meta_dict = m.model_dump()
                        except Exception:
                            pass
                    registered.append({
                        "version": entry,
                        "weights_path": weights_path,
                        "metadata": meta_dict
                    })
        return registered

def get_model_service() -> BaseWatershedModel:
    """Convenience accessor for the active Model Service."""
    return ModelLoader.get_model()
