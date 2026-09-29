import os
import sys
import shutil
import argparse
import logging
from typing import Dict, Any, Optional
import torch
from ultralytics import YOLO

from app.training.config import TrainingConfig, DatasetConfig
from app.training.validator import DatasetValidator, DatasetValidationReport
from app.training.metadata import ModelMetadata
from app.training.evaluate import ModelEvaluator, EvaluationReport

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bhuverse.training")

class TrainingPipeline:
    """
    BhuVerse Custom YOLO Fine-Tuning Pipeline.
    Supports transfer learning across arbitrary watershed object detection datasets.
    Completely dynamic class loading - zero hardcoding.
    """

    def __init__(self, config: TrainingConfig):
        self.config = config

    @classmethod
    def from_yaml(cls, config_yaml: str) -> "TrainingPipeline":
        cfg = TrainingConfig.load(config_yaml)
        return cls(cfg)

    def run(self, auto_activate: bool = False) -> Dict[str, Any]:
        """
        Executes the complete fine-tuning lifecycle:
        1. Dataset Validation
        2. Dynamic Class Extraction
        3. Model Initialization (Transfer Learning)
        4. Ultralytics Training Run
        5. Checkpoint & Metrics Resolution
        6. Unbiased Evaluation (Val & Test splits)
        7. Model Metadata Generation
        8. Model Registry Deployment
        """
        yaml_path = os.path.abspath(self.config.dataset.yaml_path)
        logger.info(f"Starting BhuVerse Training Pipeline with config: {yaml_path}")

        # -------------------------------------------------------------
        # STEP 1: DATASET VALIDATION
        # -------------------------------------------------------------
        logger.info("Step 1: Validating dataset structure and annotations...")
        val_report = DatasetValidator.validate(yaml_path, dataset_name=self.config.dataset.dataset_name)
        print(val_report.print_summary())

        if val_report.status == "FAILED":
            err_msg = f"Dataset validation failed with {len([i for i in val_report.issues if i.level == 'ERROR'])} errors. Training aborted."
            logger.error(err_msg)
            raise ValueError(err_msg)

        if val_report.total_valid_boxes == 0:
            err_msg = "Dataset contains 0 valid bounding box annotations! Cannot train model without annotations."
            logger.error(err_msg)
            raise ValueError(err_msg)

        class_names = val_report.class_names
        num_classes = val_report.num_classes
        logger.info(f"Successfully loaded {num_classes} dynamic classes: {class_names}")

        # -------------------------------------------------------------
        # STEP 2: HARDWARE & ENVIRONMENT DETECTION
        # -------------------------------------------------------------
        cuda_available = torch.cuda.is_available()
        device_str = self.config.resolve_device()
        device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU"
        logger.info(f"Hardware Environment: Device={device_str} ({device_name}) | CUDA Available={cuda_available}")

        if not cuda_available:
            logger.warning("CUDA is not available. Training will run on CPU (this may be slower).")

        # -------------------------------------------------------------
        # STEP 3: BASE MODEL INITIALIZATION (TRANSFER LEARNING)
        # -------------------------------------------------------------
        base_ckpt = self.config.model.checkpoint
        logger.info(f"Step 2: Loading base pretrained YOLO checkpoint: {base_ckpt}")
        model = YOLO(base_ckpt)

        # -------------------------------------------------------------
        # STEP 4: FINE-TUNING EXECUTION
        # -------------------------------------------------------------
        project_dir = os.path.abspath(self.config.output.project)
        exp_name = self.config.output.experiment_name
        os.makedirs(project_dir, exist_ok=True)

        logger.info(f"Step 3: Beginning fine-tuning for {self.config.training.epochs} epochs...")
        
        train_args = {
            "data": yaml_path,
            "epochs": self.config.training.epochs,
            "imgsz": self.config.training.image_size,
            "batch": self.config.training.batch_size,
            "patience": self.config.training.patience,
            "lr0": self.config.training.lr0,
            "lrf": self.config.training.lrf,
            "optimizer": self.config.training.optimizer,
            "workers": self.config.training.workers,
            "seed": self.config.training.seed,
            "project": project_dir,
            "name": exp_name,
            "exist_ok": True,
            "device": device_str,
            "verbose": True,
            # Augmentation parameters
            "hsv_h": self.config.augmentation.hsv_h,
            "hsv_s": self.config.augmentation.hsv_s,
            "hsv_v": self.config.augmentation.hsv_v,
            "degrees": self.config.augmentation.degrees,
            "fliplr": self.config.augmentation.fliplr,
            "flipud": self.config.augmentation.flipud,
            "mosaic": self.config.augmentation.mosaic,
            "mixup": self.config.augmentation.mixup
        }

        train_results = model.train(**train_args)

        # -------------------------------------------------------------
        # STEP 5: OUTPUT RESOLUTION & EVALUATION
        # -------------------------------------------------------------
        run_output_dir = os.path.join(project_dir, exp_name)
        weights_dir = os.path.join(run_output_dir, "weights")
        best_pt = os.path.join(weights_dir, "best.pt")
        last_pt = os.path.join(weights_dir, "last.pt")

        target_weights = best_pt if os.path.exists(best_pt) else last_pt
        if not os.path.exists(target_weights):
            raise FileNotFoundError(f"Trained weights not found in {weights_dir}")

        logger.info(f"Step 4: Running independent validation evaluation on {target_weights}...")
        val_eval = ModelEvaluator.evaluate(
            weights_path=target_weights,
            dataset_yaml=yaml_path,
            split="val",
            image_size=self.config.training.image_size,
            device=device_str
        )
        print(val_eval.print_table())

        test_eval = None
        if val_report.has_test_split:
            logger.info("Step 5: Running unbiased test split evaluation...")
            test_eval = ModelEvaluator.evaluate(
                weights_path=target_weights,
                dataset_yaml=yaml_path,
                split="test",
                image_size=self.config.training.image_size,
                device=device_str
            )
            print(test_eval.print_table())
        else:
            logger.info("Note: Test split unavailable in dataset. Final metrics reported from validation split.")

        # -------------------------------------------------------------
        # STEP 6: MODEL METADATA GENERATION
        # -------------------------------------------------------------
        metrics_payload = {
            "validation": {
                "precision": val_eval.overall_precision,
                "recall": val_eval.overall_recall,
                "map50": val_eval.overall_map50,
                "map50_95": val_eval.overall_map50_95,
                "per_class": {cm.class_name: {"precision": cm.precision, "recall": cm.recall, "map50": cm.map50, "map50_95": cm.map50_95} for cm in val_eval.class_metrics}
            }
        }
        if test_eval:
            metrics_payload["test"] = {
                "precision": test_eval.overall_precision,
                "recall": test_eval.overall_recall,
                "map50": test_eval.overall_map50,
                "map50_95": test_eval.overall_map50_95,
                "per_class": {cm.class_name: {"precision": cm.precision, "recall": cm.recall, "map50": cm.map50, "map50_95": cm.map50_95} for cm in test_eval.class_metrics}
            }

        metadata = ModelMetadata.create(
            model_name=f"BhuVerse {self.config.dataset.dataset_name.replace('_', ' ').title()} YOLO",
            model_version=exp_name,
            base_checkpoint=base_ckpt,
            dataset_name=self.config.dataset.dataset_name,
            dataset_yaml=yaml_path,
            classes=class_names,
            image_size=self.config.training.image_size,
            epochs_trained=self.config.training.epochs,
            training_device=device_name,
            metrics=metrics_payload,
            weights_file=os.path.basename(target_weights),
            random_seed=self.config.training.seed
        )

        metadata_path = os.path.join(run_output_dir, "metadata.json")
        metadata.save(metadata_path)
        logger.info(f"Saved model metadata to: {metadata_path}")

        # Save training configuration copy
        config_save_path = os.path.join(run_output_dir, "training_config.yaml")
        self.config.save(config_save_path)

        # -------------------------------------------------------------
        # STEP 7: REGISTRY DEPLOYMENT / ACTIVATION
        # -------------------------------------------------------------
        # Save to registry: models/<exp_name>/best.pt & metadata.json
        registry_dir = os.path.join("models", exp_name)
        os.makedirs(registry_dir, exist_ok=True)
        shutil.copy2(target_weights, os.path.join(registry_dir, "best.pt"))
        metadata.save(os.path.join(registry_dir, "metadata.json"))
        logger.info(f"Registered model version in: {registry_dir}")

        # Auto-activate for live inference if requested
        if auto_activate:
            active_weights = os.path.join("demo_data", "models", "watershed_weights.pt")
            active_meta = os.path.join("demo_data", "models", "metadata.json")
            os.makedirs(os.path.dirname(active_weights), exist_ok=True)
            shutil.copy2(target_weights, active_weights)
            metadata.save(active_meta)
            logger.info(f"Auto-activated trained model into live inference pipeline: {active_weights}")

        return {
            "status": "SUCCESS",
            "model_version": exp_name,
            "weights_path": target_weights,
            "metadata_path": metadata_path,
            "validation_report": val_report,
            "evaluation": val_eval,
            "classes": class_names
        }

def train_cli():
    parser = argparse.ArgumentParser(description="BhuVerse Custom YOLO Fine-Tuning Pipeline")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml dataset config")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained base model checkpoint")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution (default: 640)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    parser.add_argument("--project", type=str, default="runs/bhuverse", help="Project runs directory")
    parser.add_argument("--name", type=str, default="watershed_v1", help="Experiment / model version name")
    parser.add_argument("--device", type=str, default="auto", help="Device: 'auto', 'cuda', 'cpu'")
    parser.add_argument("--activate", action="store_true", help="Auto-activate model for live inference upon completion")

    args = parser.parse_args()

    cfg = TrainingConfig(
        model={"checkpoint": args.model},
        dataset=DatasetConfig(yaml_path=args.data, dataset_name=args.name),
        training={"epochs": args.epochs, "image_size": args.imgsz, "batch_size": args.batch, "patience": args.patience},
        output={"project": args.project, "experiment_name": args.name},
        device=args.device
    )

    pipeline = TrainingPipeline(cfg)
    pipeline.run(auto_activate=args.activate)

if __name__ == "__main__":
    train_cli()
