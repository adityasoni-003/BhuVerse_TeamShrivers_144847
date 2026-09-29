import os
import json
import pytest
import tempfile
import yaml
from PIL import Image

from app.training.validator import DatasetValidator
from app.training.config import TrainingConfig, DatasetConfig
from app.training.metadata import ModelMetadata
from app.training.converters.coco_to_yolo import convert_coco_to_yolo
from app.training.converters.voc_to_yolo import convert_voc_to_yolo
from app.analysis.models.real_model import RealWatershedModel
from app.analysis.models.model_loader import ModelLoader

SAMPLE_DATA_YAML = "datasets/sample_watershed/data.yaml"

def test_data_yaml_parsing():
    """Test dynamic class parsing from data.yaml."""
    data, class_names = DatasetValidator.parse_data_yaml(SAMPLE_DATA_YAML)
    assert isinstance(class_names, dict)
    assert len(class_names) == 3
    assert class_names[0] == "Farm Pond"
    assert class_names[1] == "Check Dam"
    assert class_names[2] == "Percolation Tank"

def test_dataset_validation_sample_dataset():
    """Test dataset validation report generation."""
    report = DatasetValidator.validate(SAMPLE_DATA_YAML)
    assert report.num_classes == 3
    assert report.total_valid_boxes == 6
    assert report.total_invalid_boxes == 0
    assert report.has_test_split is True
    assert report.status in ("PASSED", "WARNING")

def test_dataset_validation_invalid_class_id():
    """Test validator catches out-of-bounds class IDs."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create malformed dataset with class ID 99
        img_dir = os.path.join(tmpdir, "images", "train")
        lbl_dir = os.path.join(tmpdir, "labels", "train")
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        img = Image.new("RGB", (100, 100), color="blue")
        img.save(os.path.join(img_dir, "test.jpg"))

        with open(os.path.join(lbl_dir, "test.txt"), "w") as f:
            f.write("99 0.5 0.5 0.4 0.4\n") # 99 is invalid for 2-class dataset

        yaml_path = os.path.join(tmpdir, "data.yaml")
        with open(yaml_path, "w") as yf:
            yaml.dump({
                "path": tmpdir,
                "train": "images/train",
                "val": "images/train",
                "names": {0: "Farm Pond", 1: "Check Dam"}
            }, yf)

        report = DatasetValidator.validate(yaml_path)
        assert report.status == "FAILED"
        assert any(i.category == "CLASS_ID" for i in report.issues)
        assert report.total_invalid_boxes >= 1

def test_dataset_validation_invalid_bbox_coords():
    """Test validator catches out-of-bounds normalized coordinates."""
    with tempfile.TemporaryDirectory() as tmpdir:
        img_dir = os.path.join(tmpdir, "images", "train")
        lbl_dir = os.path.join(tmpdir, "labels", "train")
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        img = Image.new("RGB", (100, 100), color="blue")
        img.save(os.path.join(img_dir, "test.jpg"))

        with open(os.path.join(lbl_dir, "test.txt"), "w") as f:
            f.write("0 1.5 0.5 0.4 0.4\n") # x=1.5 > 1.0

        yaml_path = os.path.join(tmpdir, "data.yaml")
        with open(yaml_path, "w") as yf:
            yaml.dump({
                "path": tmpdir,
                "train": "images/train",
                "val": "images/train",
                "names": {0: "Farm Pond"}
            }, yf)

        report = DatasetValidator.validate(yaml_path)
        assert report.status == "FAILED"
        assert any(i.category == "BBOX" for i in report.issues)

def test_training_config_yaml_serialization():
    """Test TrainingConfig serialization and deserialization."""
    cfg = TrainingConfig(
        model={"checkpoint": "yolo11n.pt"},
        dataset=DatasetConfig(yaml_path="datasets/watershed/data.yaml", dataset_name="custom_watershed"),
        training={"epochs": 75, "image_size": 640, "batch_size": 32, "patience": 20},
        output={"project": "runs/test_project", "experiment_name": "watershed_v2"},
        device="cpu"
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        save_path = os.path.join(tmpdir, "config.yaml")
        cfg.save(save_path)

        loaded_cfg = TrainingConfig.load(save_path)
        assert loaded_cfg.model.checkpoint == "yolo11n.pt"
        assert loaded_cfg.training.epochs == 75
        assert loaded_cfg.training.batch_size == 32
        assert loaded_cfg.output.experiment_name == "watershed_v2"

def test_model_metadata_creation_and_loading():
    """Test ModelMetadata creation, saving, and dynamic class mapping."""
    dynamic_classes = {0: "Farm Pond", 1: "Check Dam", 2: "Canal", 3: "Percolation Tank"}
    metrics = {
        "validation": {
            "precision": 0.892,
            "recall": 0.854,
            "map50": 0.912,
            "map50_95": 0.724
        }
    }

    meta = ModelMetadata.create(
        model_name="BhuVerse Multi-Asset Watershed YOLO",
        model_version="watershed_combined_v1",
        base_checkpoint="yolov8n.pt",
        dataset_name="multi_watershed_dataset",
        dataset_yaml="/path/to/data.yaml",
        classes=dynamic_classes,
        image_size=640,
        epochs_trained=100,
        training_device="CPU",
        metrics=metrics,
        weights_file="best.pt"
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        meta_file = os.path.join(tmpdir, "metadata.json")
        meta.save(meta_file)

        loaded = ModelMetadata.load(meta_file)
        assert loaded.model_version == "watershed_combined_v1"
        assert loaded.num_classes == 4
        assert loaded.classes[2] == "Canal"
        assert loaded.metrics["validation"]["map50"] == 0.912

def test_coco_to_yolo_converter():
    """Test converting COCO JSON to standard YOLO dataset."""
    with tempfile.TemporaryDirectory() as tmpdir:
        coco_dir = os.path.join(tmpdir, "coco")
        yolo_dir = os.path.join(tmpdir, "yolo")
        images_dir = os.path.join(coco_dir, "images")
        os.makedirs(images_dir, exist_ok=True)

        # Create dummy image
        img = Image.new("RGB", (200, 100), color="green")
        img.save(os.path.join(images_dir, "pond_sample.jpg"))

        coco_data = {
            "images": [{"id": 1, "file_name": "pond_sample.jpg", "width": 200, "height": 100}],
            "categories": [{"id": 10, "name": "Farm Pond"}, {"id": 20, "name": "Check Dam"}],
            "annotations": [
                {"id": 1, "image_id": 1, "category_id": 10, "bbox": [20, 10, 80, 40]} # [x, y, w, h] in pixels
            ]
        }
        json_path = os.path.join(coco_dir, "annotations.json")
        with open(json_path, "w") as f:
            json.dump(coco_data, f)

        out_yaml = convert_coco_to_yolo(
            coco_json_path=json_path,
            images_dir=images_dir,
            output_dir=yolo_dir,
            split_name="train"
        )

        assert os.path.exists(out_yaml)
        report = DatasetValidator.validate(out_yaml)
        assert report.num_classes == 2
        assert report.total_valid_boxes == 1

def test_real_watershed_model_zero_detection_honesty():
    """
    CRITICAL TEST:
    Verify that when no objects are detected above threshold, the model reports
    'No relevant object detected' with 0.0 confidence, and NEVER invents fake predictions.
    """
    weights_path = "demo_data/models/watershed_weights.pt"
    if os.path.exists(weights_path):
        with tempfile.TemporaryDirectory() as tmpdir:
            import shutil
            test_weights = os.path.join(tmpdir, "best.pt")
            shutil.copy2(weights_path, test_weights)
            
            # Create valid watershed metadata in the folder
            meta = ModelMetadata.create(
                model_name="BhuVerse Watershed Test Model",
                model_version="test_v1",
                base_checkpoint="yolov8n.pt",
                dataset_name="test_watershed",
                dataset_yaml="data.yaml",
                classes={0: "Farm Pond", 1: "Check Dam"},
                image_size=640,
                epochs_trained=10,
                training_device="CPU"
            )
            meta.save(os.path.join(tmpdir, "metadata.json"))

            model = RealWatershedModel(weights_path=test_weights, confidence_threshold=0.99)
            blank_img = Image.new("RGB", (300, 300), color="white")
            result = model.predict(blank_img)

            assert len(result.predictions) == 1
            assert result.predictions[0].label == "No relevant object detected"
            assert result.predictions[0].confidence == 0.0
            assert result.predictions[0].bbox is None
            assert result.inference_mode == "Real Inference"
