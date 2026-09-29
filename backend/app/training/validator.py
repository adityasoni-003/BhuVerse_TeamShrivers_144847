import os
import yaml
from typing import Dict, List, Any, Optional, Tuple, Set
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError

class ValidationIssue(BaseModel):
    level: str # "ERROR" | "WARNING"
    category: str # "YAML", "IMAGE", "LABEL", "CLASS_ID", "BBOX", "LEAKAGE"
    message: str
    file_path: Optional[str] = None

class DatasetValidationReport(BaseModel):
    dataset_name: str
    yaml_path: str
    status: str # "PASSED" | "WARNING" | "FAILED"
    num_classes: int
    class_names: Dict[int, str]
    splits: Dict[str, Dict[str, int]] # e.g. {"train": {"images": 100, "labels": 95, "boxes": 250}, ...}
    class_distribution: Dict[str, Dict[str, int]] # e.g. {"train": {"Farm Pond": 120, ...}, ...}
    issues: List[ValidationIssue]
    total_valid_boxes: int = 0
    total_invalid_boxes: int = 0
    has_test_split: bool = False

    def print_summary(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append(f"DATASET VALIDATION REPORT: {self.dataset_name}")
        lines.append("=" * 60)
        lines.append(f"Config File : {self.yaml_path}")
        lines.append(f"Status      : {self.status}")
        lines.append(f"Classes ({self.num_classes}) : {', '.join([f'{k}: {v}' for k, v in self.class_names.items()])}")
        lines.append("-" * 60)
        lines.append("SPLIT SUMMARY:")
        for split, stats in self.splits.items():
            lines.append(f"  • {split.upper():<6}: {stats.get('images', 0):>4} images | {stats.get('labels', 0):>4} label files | {stats.get('boxes', 0):>4} valid bboxes")
        lines.append("-" * 60)
        lines.append("CLASS DISTRIBUTION (Valid Annotations):")
        for split, dist in self.class_distribution.items():
            lines.append(f"  [{split.upper()}]")
            for cls_name, count in dist.items():
                lines.append(f"    - {cls_name:<25}: {count:>5}")
        lines.append("-" * 60)
        lines.append(f"Total Valid BBoxes  : {self.total_valid_boxes}")
        lines.append(f"Total Invalid BBoxes: {self.total_invalid_boxes}")
        lines.append(f"Issues Found        : {len(self.issues)} (Errors: {len([i for i in self.issues if i.level == 'ERROR'])}, Warnings: {len([i for i in self.issues if i.level == 'WARNING'])})")
        if self.issues:
            lines.append("-" * 60)
            lines.append("TOP ISSUES:")
            for issue in self.issues[:15]:
                lines.append(f"  [{issue.level}] {issue.category}: {issue.message}")
            if len(self.issues) > 15:
                lines.append(f"  ... and {len(self.issues) - 15} more issues.")
        lines.append("=" * 60)
        return "\n".join(lines)

class DatasetValidator:
    """
    Validates YOLO Object Detection Datasets.
    Performs comprehensive structural, formatting, coordinate, and semantic integrity checks.
    """

    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

    @classmethod
    def parse_data_yaml(cls, yaml_path: str) -> Tuple[Dict[str, Any], Dict[int, str]]:
        if not os.path.exists(yaml_path):
            raise FileNotFoundError(f"Dataset YAML file not found: {yaml_path}")

        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not isinstance(data, dict):
            raise ValueError(f"Invalid YAML content in {yaml_path}. Expected a dictionary.")

        # Extract dynamic class names
        raw_names = data.get("names", {})
        class_names: Dict[int, str] = {}

        if isinstance(raw_names, list):
            for idx, name in enumerate(raw_names):
                class_names[idx] = str(name).strip()
        elif isinstance(raw_names, dict):
            for k, v in raw_names.items():
                class_names[int(k)] = str(v).strip()
        else:
            raise ValueError(f"'names' in {yaml_path} must be a list or dictionary of class names.")

        if len(class_names) == 0:
            raise ValueError(f"No classes defined under 'names' in {yaml_path}.")

        return data, class_names

    @classmethod
    def validate(cls, yaml_path: str, dataset_name: Optional[str] = None) -> DatasetValidationReport:
        yaml_abs = os.path.abspath(yaml_path)
        base_dir = os.path.dirname(yaml_abs)

        issues: List[ValidationIssue] = []

        try:
            yaml_data, class_names = cls.parse_data_yaml(yaml_abs)
        except Exception as e:
            return DatasetValidationReport(
                dataset_name=dataset_name or os.path.basename(os.path.dirname(yaml_abs)),
                yaml_path=yaml_abs,
                status="FAILED",
                num_classes=0,
                class_names={},
                splits={},
                class_distribution={},
                issues=[ValidationIssue(level="ERROR", category="YAML", message=str(e), file_path=yaml_abs)]
            )

        d_name = dataset_name or yaml_data.get("dataset_name") or os.path.basename(os.path.dirname(yaml_abs))
        root_path = yaml_data.get("path", "")
        if root_path and not os.path.isabs(root_path):
            root_path = os.path.normpath(os.path.join(base_dir, root_path))
        elif not root_path:
            root_path = base_dir

        num_classes = len(class_names)
        splits_stats: Dict[str, Dict[str, int]] = {}
        class_distribution: Dict[str, Dict[str, int]] = {}
        all_split_filenames: Dict[str, Set[str]] = {}

        total_valid = 0
        total_invalid = 0

        # Required splits
        check_splits = [("train", True), ("val", True), ("test", False)]
        has_test = False

        for split_key, is_required in check_splits:
            rel_path = yaml_data.get(split_key)
            if not rel_path:
                if is_required:
                    issues.append(ValidationIssue(
                        level="ERROR",
                        category="YAML",
                        message=f"Missing required split '{split_key}' in {yaml_abs}"
                    ))
                continue

            # Resolve split path
            split_dir = rel_path if os.path.isabs(rel_path) else os.path.normpath(os.path.join(root_path, rel_path))
            
            if not os.path.exists(split_dir):
                if is_required:
                    issues.append(ValidationIssue(
                        level="ERROR",
                        category="IMAGE",
                        message=f"Image directory for split '{split_key}' does not exist: {split_dir}"
                    ))
                continue

            if split_key == "test":
                has_test = True

            # Determine corresponding label directory
            # Standard YOLO layout: images/train -> labels/train or alongside
            if "images" in split_dir:
                label_dir = split_dir.replace("images", "labels")
            else:
                label_dir = os.path.join(os.path.dirname(split_dir), "labels", os.path.basename(split_dir))

            # Scan images
            img_files = []
            for root, _, files in os.walk(split_dir):
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in cls.IMAGE_EXTENSIONS:
                        img_files.append(os.path.join(root, f))

            all_split_filenames[split_key] = {os.path.basename(p) for p in img_files}

            split_boxes = 0
            split_dist = {name: 0 for name in class_names.values()}
            labels_found = 0

            for img_path in img_files:
                # 1. Verify image file integrity
                try:
                    with Image.open(img_path) as im:
                        im.verify()
                except Exception as img_err:
                    issues.append(ValidationIssue(
                        level="ERROR",
                        category="IMAGE",
                        message=f"Corrupted image file: {os.path.basename(img_path)} ({img_err})",
                        file_path=img_path
                    ))
                    continue

                # 2. Check label file
                base_name = os.path.splitext(os.path.basename(img_path))[0]
                label_file = os.path.join(label_dir, f"{base_name}.txt")

                if not os.path.exists(label_file):
                    issues.append(ValidationIssue(
                        level="WARNING",
                        category="LABEL",
                        message=f"Image without label file: {os.path.basename(img_path)}",
                        file_path=img_path
                    ))
                    continue

                labels_found += 1
                try:
                    with open(label_file, "r", encoding="utf-8") as lf:
                        lines = lf.readlines()
                except Exception as lf_err:
                    issues.append(ValidationIssue(
                        level="ERROR",
                        category="LABEL",
                        message=f"Cannot read label file {os.path.basename(label_file)}: {lf_err}",
                        file_path=label_file
                    ))
                    continue

                if len(lines) == 0:
                    issues.append(ValidationIssue(
                        level="WARNING",
                        category="LABEL",
                        message=f"Empty annotation file (background image): {os.path.basename(label_file)}",
                        file_path=label_file
                    ))
                    continue

                for line_idx, line in enumerate(lines, start=1):
                    parts = line.strip().split()
                    if len(parts) != 5:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            category="BBOX",
                            message=f"{os.path.basename(label_file)} line {line_idx}: Expected 5 values (class_id x y w h), got {len(parts)}",
                            file_path=label_file
                        ))
                        total_invalid += 1
                        continue

                    try:
                        cls_id = int(parts[0])
                        x = float(parts[1])
                        y = float(parts[2])
                        w = float(parts[3])
                        h = float(parts[4])
                    except ValueError as ve:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            category="BBOX",
                            message=f"{os.path.basename(label_file)} line {line_idx}: Non-numeric value ({ve})",
                            file_path=label_file
                        ))
                        total_invalid += 1
                        continue

                    # Validate class ID
                    if cls_id < 0 or cls_id >= num_classes:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            category="CLASS_ID",
                            message=f"{os.path.basename(label_file)} line {line_idx}: Class ID {cls_id} is out of bounds [0, {num_classes - 1}]",
                            file_path=label_file
                        ))
                        total_invalid += 1
                        continue

                    # Validate normalized coordinates [0, 1]
                    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        issues.append(ValidationIssue(
                            level="ERROR",
                            category="BBOX",
                            message=f"{os.path.basename(label_file)} line {line_idx}: Coordinates out of [0, 1] range (x={x}, y={y}, w={w}, h={h})",
                            file_path=label_file
                        ))
                        total_invalid += 1
                        continue

                    # Valid annotation
                    cls_name = class_names[cls_id]
                    split_dist[cls_name] += 1
                    split_boxes += 1
                    total_valid += 1

            splits_stats[split_key] = {
                "images": len(img_files),
                "labels": labels_found,
                "boxes": split_boxes
            }
            class_distribution[split_key] = split_dist

        # Check for data leakage across splits
        if "train" in all_split_filenames and "val" in all_split_filenames:
            train_val_overlap = all_split_filenames["train"].intersection(all_split_filenames["val"])
            if train_val_overlap:
                issues.append(ValidationIssue(
                    level="ERROR",
                    category="LEAKAGE",
                    message=f"Data Leakage detected! {len(train_val_overlap)} images are present in both 'train' and 'val' splits: {list(train_val_overlap)[:5]}"
                ))

        # Check for missing classes in validation
        if "val" in class_distribution:
            for cls_name, count in class_distribution["val"].items():
                if count == 0 and splits_stats.get("val", {}).get("images", 0) > 0:
                    issues.append(ValidationIssue(
                        level="WARNING",
                        category="CLASS_ID",
                        message=f"Class '{cls_name}' has 0 annotations in validation split."
                    ))

        # Determine overall status
        has_errors = any(i.level == "ERROR" for i in issues)
        has_warnings = any(i.level == "WARNING" for i in issues)

        if has_errors:
            status = "FAILED"
        elif has_warnings:
            status = "WARNING"
        else:
            status = "PASSED"

        return DatasetValidationReport(
            dataset_name=d_name,
            yaml_path=yaml_abs,
            status=status,
            num_classes=num_classes,
            class_names=class_names,
            splits=splits_stats,
            class_distribution=class_distribution,
            issues=issues,
            total_valid_boxes=total_valid,
            total_invalid_boxes=total_invalid,
            has_test_split=has_test
        )
