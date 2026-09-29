import os
import xml.etree.ElementTree as ET
import shutil
import yaml
from typing import Dict, List, Optional

def convert_voc_to_yolo(
    annotations_dir: str,
    images_dir: str,
    output_dir: str,
    classes_list: Optional[List[str]] = None,
    split_name: str = "train"
) -> str:
    """
    Converts Pascal VOC XML format annotations to standard YOLO format.
    """
    if not os.path.exists(annotations_dir):
        raise FileNotFoundError(f"VOC XML directory not found: {annotations_dir}")
    if not os.path.exists(images_dir):
        raise FileNotFoundError(f"Images directory not found: {images_dir}")

    out_img_dir = os.path.join(output_dir, "images", split_name)
    out_lbl_dir = os.path.join(output_dir, "labels", split_name)
    os.makedirs(out_img_dir, exist_ok=True)
    os.makedirs(out_lbl_dir, exist_ok=True)

    # Discover classes if not provided
    discovered_classes = set()
    xml_files = [f for f in os.listdir(annotations_dir) if f.lower().endswith(".xml")]

    for xml_file in xml_files:
        tree = ET.parse(os.path.join(annotations_dir, xml_file))
        root = tree.getroot()
        for obj in root.findall("object"):
            name = obj.find("name").text.strip()
            discovered_classes.add(name)

    class_list = classes_list or sorted(list(discovered_classes))
    class_to_id = {name: idx for idx, name in enumerate(class_list)}
    class_names = {idx: name for idx, name in enumerate(class_list)}

    for xml_file in xml_files:
        tree = ET.parse(os.path.join(annotations_dir, xml_file))
        root = tree.getroot()

        size = root.find("size")
        if size is None:
            continue
        img_w = float(size.find("width").text)
        img_h = float(size.find("height").text)

        filename_elem = root.find("filename")
        img_filename = filename_elem.text if filename_elem is not None else xml_file.replace(".xml", ".jpg")

        src_img = os.path.join(images_dir, img_filename)
        if not os.path.exists(src_img):
            for ext in [".jpg", ".jpeg", ".png"]:
                candidate = os.path.join(images_dir, os.path.splitext(img_filename)[0] + ext)
                if os.path.exists(candidate):
                    src_img = candidate
                    break

        if os.path.exists(src_img):
            shutil.copy2(src_img, os.path.join(out_img_dir, os.path.basename(src_img)))

        base_name = os.path.splitext(xml_file)[0]
        label_file = os.path.join(out_lbl_dir, f"{base_name}.txt")

        lines = []
        for obj in root.findall("object"):
            cls_name = obj.find("name").text.strip()
            if cls_name not in class_to_id:
                continue
            cls_id = class_to_id[cls_name]

            bndbox = obj.find("bndbox")
            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)

            w = xmax - xmin
            h = ymax - ymin
            x_center = (xmin + w / 2.0) / img_w
            y_center = (ymin + h / 2.0) / img_h
            norm_w = w / img_w
            norm_h = h / img_h

            x_center = max(0.0, min(1.0, x_center))
            y_center = max(0.0, min(1.0, y_center))
            norm_w = max(0.0, min(1.0, norm_w))
            norm_h = max(0.0, min(1.0, norm_h))

            lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n")

        with open(label_file, "w", encoding="utf-8") as lf:
            lf.writelines(lines)

    yaml_path = os.path.join(output_dir, "data.yaml")
    yaml_content = {
        "path": os.path.abspath(output_dir),
        "train": f"images/{split_name}",
        "val": f"images/{split_name}" if split_name != "train" else f"images/val",
        "names": class_names
    }
    if split_name == "train":
        os.makedirs(os.path.join(output_dir, "images", "val"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "labels", "val"), exist_ok=True)
    with open(yaml_path, "w", encoding="utf-8") as yf:
        yaml.dump(yaml_content, yf, default_flow_style=False, sort_keys=False)

    return yaml_path
