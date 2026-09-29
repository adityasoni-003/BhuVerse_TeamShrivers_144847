import os
import yaml
from PIL import Image, ImageDraw

def create_sample_watershed_dataset(base_dir: str = "datasets/sample_watershed"):
    """
    Generates a small synthetic YOLO dataset with 3 dynamic watershed classes:
    0: Farm Pond
    1: Check Dam
    2: Percolation Tank
    Used strictly for automated pipeline testing and validation.
    """
    os.makedirs(base_dir, exist_ok=True)

    splits = {
        "train": [
            ("pond_01.jpg", 0, 0.5, 0.5, 0.4, 0.3, "blue"),
            ("checkdam_01.jpg", 1, 0.5, 0.6, 0.3, 0.2, "brown"),
            ("percolation_01.jpg", 2, 0.4, 0.4, 0.5, 0.5, "cyan")
        ],
        "val": [
            ("pond_val_01.jpg", 0, 0.5, 0.5, 0.35, 0.35, "blue"),
            ("dam_val_01.jpg", 1, 0.5, 0.5, 0.4, 0.25, "brown")
        ],
        "test": [
            ("pond_test_01.jpg", 0, 0.5, 0.5, 0.4, 0.4, "blue")
        ]
    }

    for split, items in splits.items():
        img_dir = os.path.join(base_dir, "images", split)
        lbl_dir = os.path.join(base_dir, "labels", split)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        for filename, cls_id, x, y, w, h, color in items:
            # Create synthetic image
            img = Image.new("RGB", (320, 240), color=color)
            draw = ImageDraw.Draw(img)
            draw.rectangle([x*320 - w*160, y*240 - h*120, x*320 + w*160, y*240 + h*120], outline="white", width=2)
            img.save(os.path.join(img_dir, filename), "JPEG")

            # Create YOLO label file
            base_name = os.path.splitext(filename)[0]
            with open(os.path.join(lbl_dir, f"{base_name}.txt"), "w", encoding="utf-8") as lf:
                lf.write(f"{cls_id} {x:.4f} {y:.4f} {w:.4f} {h:.4f}\n")

    yaml_path = os.path.join(base_dir, "data.yaml")
    yaml_dict = {
        "path": os.path.abspath(base_dir),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {
            0: "Farm Pond",
            1: "Check Dam",
            2: "Percolation Tank"
        }
    }

    with open(yaml_path, "w", encoding="utf-8") as yf:
        yaml.dump(yaml_dict, yf, default_flow_style=False, sort_keys=False)

    print(f"Generated sample watershed dataset in {base_dir}")
    return yaml_path

if __name__ == "__main__":
    create_sample_watershed_dataset()
