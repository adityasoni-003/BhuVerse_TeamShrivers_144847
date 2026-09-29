import argparse
import sys
from app.training.validator import DatasetValidator
from app.training.evaluate import ModelEvaluator
from app.training.train import TrainingPipeline, train_cli
from app.training.config import TrainingConfig, DatasetConfig
from app.training.converters.coco_to_yolo import convert_coco_to_yolo
from app.training.converters.voc_to_yolo import convert_voc_to_yolo

def main():
    parser = argparse.ArgumentParser(
        prog="python -m app.training.cli",
        description="BhuVerse Watershed YOLO Fine-Tuning & Dataset Toolkit"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. Validate Command
    val_p = subparsers.add_parser("validate", help="Validate a YOLO object detection dataset")
    val_p.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    val_p.add_argument("--name", type=str, default="watershed_dataset", help="Dataset name")

    # 2. Train Command
    train_p = subparsers.add_parser("train", help="Fine-tune YOLO on custom dataset")
    train_p.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    train_p.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained base model checkpoint")
    train_p.add_argument("--epochs", type=int, default=50, help="Training epochs")
    train_p.add_argument("--imgsz", type=int, default=640, help="Image size (default: 640)")
    train_p.add_argument("--batch", type=int, default=16, help="Batch size")
    train_p.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    train_p.add_argument("--project", type=str, default="runs/bhuverse", help="Output project directory")
    train_p.add_argument("--name", type=str, default="watershed_v1", help="Experiment name")
    train_p.add_argument("--device", type=str, default="auto", help="Device (auto/cuda/cpu)")
    train_p.add_argument("--activate", action="store_true", help="Auto-activate model for live inference")

    # 3. Evaluate Command
    eval_p = subparsers.add_parser("evaluate", help="Evaluate trained YOLO model on dataset split")
    eval_p.add_argument("--weights", type=str, required=True, help="Path to model weights (.pt)")
    eval_p.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    eval_p.add_argument("--split", type=str, default="val", choices=["val", "test"], help="Split to evaluate")
    eval_p.add_argument("--imgsz", type=int, default=640, help="Image size")
    eval_p.add_argument("--device", type=str, default="auto", help="Device (auto/cuda/cpu)")

    # 4. Convert Command
    conv_p = subparsers.add_parser("convert", help="Convert COCO JSON or Pascal VOC to YOLO format")
    conv_p.add_argument("--format", type=str, required=True, choices=["coco", "voc"], help="Source format")
    conv_p.add_argument("--source", type=str, required=True, help="Source JSON file (COCO) or XML directory (VOC)")
    conv_p.add_argument("--images", type=str, required=True, help="Source images directory")
    conv_p.add_argument("--output", type=str, required=True, help="Output YOLO dataset directory")
    conv_p.add_argument("--split", type=str, default="train", help="Split name (train/val/test)")

    args = parser.parse_args()

    if args.command == "validate":
        report = DatasetValidator.validate(args.data, dataset_name=args.name)
        print(report.print_summary())
        sys.exit(1 if report.status == "FAILED" else 0)

    elif args.command == "train":
        cfg = TrainingConfig(
            model={"checkpoint": args.model},
            dataset=DatasetConfig(yaml_path=args.data, dataset_name=args.name),
            training={"epochs": args.epochs, "image_size": args.imgsz, "batch_size": args.batch, "patience": args.patience},
            output={"project": args.project, "experiment_name": args.name},
            device=args.device
        )
        pipeline = TrainingPipeline(cfg)
        res = pipeline.run(auto_activate=args.activate)
        print(f"\nTraining completed successfully. Model registered: {res['model_version']}")

    elif args.command == "evaluate":
        report = ModelEvaluator.evaluate(
            weights_path=args.weights,
            dataset_yaml=args.data,
            split=args.split,
            image_size=args.imgsz,
            device=args.device
        )
        print(report.print_table())

    elif args.command == "convert":
        if args.format == "coco":
            out_yaml = convert_coco_to_yolo(args.source, args.images, args.output, split_name=args.split)
            print(f"Successfully converted COCO dataset to YOLO: {out_yaml}")
        elif args.format == "voc":
            out_yaml = convert_voc_to_yolo(args.source, args.images, args.output, split_name=args.split)
            print(f"Successfully converted Pascal VOC dataset to YOLO: {out_yaml}")

if __name__ == "__main__":
    main()
