import os
import json
import shutil
import yaml
from typing import Dict, List, Any, Optional

def convert_coco_to_yolo(
    coco_json_path: str,
    images_dir: str,
    output_dir: str,
    split_name: str = "train",
    dataset_name: str = "watershed_dataset"
) -> str:
    """
    Converts a COCO format annotation JSON file into standard YOLO format dataset.
    """
    if not os.path.exists(coco_json_path):
        raise FileNotFoundError(f"COCO JSON file not found: {coco_json_path}")
    if not os.path.exists(images_dir):
        raise FileNotFoundError(f"Images directory not found: {images_dir}")

    with open(coco_json_path, "r", encoding="utf-8") as f:
        coco = json.load(f)

    # Output directory layout
    out_img_dir = os.path.join(output_dir, "images", split_name)
    out_lbl_dir = os.path.join(output_dir, "labels", split_name)
    os.makedirs(out_img_dir, exist_ok=True)
    os.makedirs(out_lbl_dir, exist_ok=True)

    # Categories: Map COCO category_id -> YOLO class_id (0-indexed)
    categories = coco.get("categories", [])
    categories = sorted(categories, key=lambda c: c["id"])
    coco_to_yolo_cat: Dict[int, int] = {}
    class_names: Dict[int, str] = {}

    for yolo_id, cat in enumerate(categories):
        coco_to_yolo_cat[cat["id"]] = yolo_id
        class_names[yolo_id] = cat["name"]

    # Image mapping: image_id -> image_dict
    images = {img["id"]: img for img in coco.get("images", [])}

    # Group annotations by image_id
    img_annotations: Dict[int, List[Dict[str, Any]]] = {}
    for ann in coco.get("annotations", []):
        img_id = ann["image_id"]
        if img_id not in img_annotations:
            img_annotations[img_id] = []
        img_annotations[img_id].append(ann)

    # Process each image and write labels
    for img_id, img_info in images.items():
        file_name = img_info["file_name"]
        img_w = float(img_info["width"])
        img_h = float(img_info["height"])

        src_img = os.path.join(images_dir, file_name)
        dst_img = os.path.join(out_img_dir, os.path.basename(file_name))
        if os.path.exists(src_img) and not os.path.exists(dst_img):
            shutil.copy2(src_img, dst_img)

        # Write label file
        base_name = os.path.splitext(os.path.basename(file_name))[0]
        label_file = os.path.join(out_lbl_dir, f"{base_name}.txt")

        lines = []
        for ann in img_annotations.get(img_id, []):
            cat_id = ann["category_id"]
            if cat_id not in coco_to_yolo_cat:
                continue
            yolo_cls = coco_to_yolo_cat[cat_id]

            # COCO bbox: [x_min, y_min, width, height] (pixels)
            bbox = ann["bbox"]
            x_min, y_min, w, h = bbox[0], bbox[1], bbox[2], bbox[3]

            # Convert to YOLO normalized center coordinates
            x_center = (x_min + w / 2.0) / img_w
            y_center = (y_min + h / 2.0) / img_h
            norm_w = w / img_w
            norm_h = h / img_h

            # Clamp [0, 1]
            x_center = max(0.0, min(1.0, x_center))
            y_center = max(0.0, min(1.0, y_center))
            norm_w = max(0.0, min(1.0, norm_w))
            norm_h = max(0.0, min(1.0, norm_h))

            lines.append(f"{yolo_cls} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n")

        with open(label_file, "w", encoding="utf-8") as lf:
            lf.writelines(lines)

    # Write data.yaml
    yaml_path = os.path.join(output_dir, "data.yaml")
    yaml_content = {
        "path": os.path.abspath(output_dir),
        "train": f"images/{split_name}",
        "val": f"images/{split_name}" if split_name != "train" else f"images/val",
        "names": class_names
    }
    # Ensure val dir exists to pass validation cleanly if created
    if split_name == "train":
        os.makedirs(os.path.join(output_dir, "images", "val"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "labels", "val"), exist_ok=True)
    with open(yaml_path, "w", encoding="utf-8") as yf:
        yaml.dump(yaml_content, yf, default_flow_style=False, sort_keys=False)

    return yaml_path
