# BhuVerse — Custom YOLO Fine-Tuning & Dataset Guide

This guide describes how to train, validate, evaluate, and deploy custom YOLO object detection models for watershed ground assets (Farm Ponds, Check Dams, Percolation Tanks, Canals, Drainage Networks, Water Bodies, etc.) using the BhuVerse fine-tuning pipeline.

---

## 1. Dataset Preparation & Folder Structure

BhuVerse uses standard YOLO object detection format. Datasets must be arranged with separate image and label directories across `train`, `val`, and optional `test` splits:

```
datasets/my_watershed_dataset/
├── data.yaml
├── images/
│   ├── train/
│   │   ├── pond_001.jpg
│   │   └── checkdam_002.jpg
│   ├── val/
│   │   ├── pond_val_001.jpg
│   │   └── checkdam_val_002.jpg
│   └── test/               # Optional unbiased test split
│       └── pond_test_001.jpg
└── labels/
    ├── train/
    │   ├── pond_001.txt
    │   └── checkdam_002.txt
    ├── val/
    │   ├── pond_val_001.txt
    │   └── checkdam_val_002.txt
    └── test/
        └── pond_test_001.txt
```

---

## 2. YOLO Annotation Format

Each image must have a corresponding `.txt` file with the exact same base filename (e.g. `pond_001.jpg` $\rightarrow$ `pond_001.txt`).

Each line in the label file represents one bounding box in normalized coordinates $[0.0, 1.0]$:

```
<class_id> <x_center> <y_center> <width> <height>
```

### Example (`pond_001.txt`):
```
0 0.452000 0.518000 0.380000 0.290000
1 0.781000 0.340000 0.150000 0.120000
```

- `<class_id>`: Integer index starting from `0` to `num_classes - 1`.
- `<x_center>`, `<y_center>`: Normalized horizontal and vertical centers of the bounding box relative to image width and height.
- `<width>`, `<height>`: Normalized width and height of the box.

---

## 3. Dataset Configuration (`data.yaml`)

Every dataset requires a `data.yaml` defining split locations and class names:

```yaml
path: datasets/my_watershed_dataset  # Dataset root directory
train: images/train                  # Train images (relative to path)
val: images/val                      # Validation images (relative to path)
test: images/test                    # (Optional) Test images

# Dynamic Class Definitions (NO hardcoding required)
names:
  0: Farm Pond
  1: Check Dam
  2: Percolation Tank
  3: Canal
  4: Water Body
  5: Stream / Drainage
```

---

## 4. Converting Existing Datasets

BhuVerse provides built-in format conversion tools:

### Convert from COCO JSON:
```bash
python -m app.training.cli convert \
    --format coco \
    --source /path/to/annotations.json \
    --images /path/to/images/ \
    --output datasets/watershed_coco_converted/ \
    --split train
```

### Convert from Pascal VOC XML:
```bash
python -m app.training.cli convert \
    --format voc \
    --source /path/to/Annotations/ \
    --images /path/to/JPEGImages/ \
    --output datasets/watershed_voc_converted/ \
    --split train
```

---

## 5. Validating Dataset Integrity

Before training, always run the validation suite. It inspects:
- Missing images or labels
- Out-of-bounds class IDs
- Invalid coordinates ($< 0$ or $> 1$)
- Corrupted images
- Data leakage (images duplicated between train & val)
- Class imbalance and missing validation classes

```bash
cd backend
.\venv\Scripts\python -m app.training.cli validate --data datasets/sample_watershed/data.yaml
```

---

## 6. Fine-Tuning a Custom YOLO Model

To train a model using transfer learning from a pretrained checkpoint:

```bash
cd backend
.\venv\Scripts\python -m app.training.cli train \
    --data datasets/my_watershed_dataset/data.yaml \
    --model yolov8n.pt \
    --epochs 50 \
    --imgsz 640 \
    --batch 16 \
    --name watershed_v1 \
    --device auto \
    --activate
```

### Key Flags:
- `--data`: Path to dataset `data.yaml`.
- `--model`: Base checkpoint (`yolov8n.pt`, `yolo11n.pt`, `yolov8s.pt`, etc.).
- `--epochs`: Number of training epochs (default: `50`).
- `--imgsz`: Input image resolution (default: `640`).
- `--batch`: Batch size (default: `16`).
- `--name`: Experiment version tag (e.g. `watershed_v1`).
- `--device`: Target device (`auto`, `cuda`, `cpu`).
- `--activate`: Automatically deploys the resulting `best.pt` and `metadata.json` into the active live inference pipeline.

---

## 7. Model Outputs & Metadata

Training saves all artifacts in `runs/bhuverse/<experiment_name>/` and registers the version in `models/<experiment_name>/`:

```
runs/bhuverse/watershed_v1/
├── weights/
│   ├── best.pt              # Best validation checkpoint
│   └── last.pt              # Final epoch checkpoint
├── results.csv              # Epoch-by-epoch loss & metric curves
├── metadata.json            # Model specifications, dynamic classes & metrics
└── training_config.yaml     # Full reproducible training parameters
```

### Sample `metadata.json`:
```json
{
  "model_name": "BhuVerse Watershed YOLO",
  "model_version": "watershed_v1",
  "base_checkpoint": "yolov8n.pt",
  "framework": "Ultralytics YOLO",
  "dataset_name": "watershed_v1",
  "classes": {
    "0": "Farm Pond",
    "1": "Check Dam",
    "2": "Percolation Tank"
  },
  "num_classes": 3,
  "image_size": 640,
  "epochs_trained": 50,
  "metrics": {
    "validation": {
      "precision": 0.892,
      "recall": 0.854,
      "map50": 0.912,
      "map50_95": 0.724
    }
  },
  "weights_file": "best.pt"
}
```

---

## 8. Independent Evaluation

To evaluate any trained weights file on validation or test splits:

```bash
cd backend
.\venv\Scripts\python -m app.training.cli evaluate \
    --weights models/watershed_v1/best.pt \
    --data datasets/my_watershed_dataset/data.yaml \
    --split val
```

---

## 9. Activating Models in BhuVerse Live Inference

To activate any trained model version for live web inference:

### Option A: Via CLI Flag
Pass `--activate` during training.

### Option B: Manual Deployment
Copy `best.pt` and `metadata.json` from `models/<version>/` to `demo_data/models/`:
```bash
copy models\watershed_v1\best.pt demo_data\models\watershed_weights.pt
copy models\watershed_v1\metadata.json demo_data\models\metadata.json
```

---

## 10. Understanding Evaluation Metrics

- **Precision**: Proportion of correct detections among all detections made ($\frac{TP}{TP + FP}$).
- **Recall**: Proportion of true watershed assets successfully detected ($\frac{TP}{TP + FN}$).
- **mAP@50**: Mean Average Precision calculated at Intersection-over-Union (IoU) threshold of 0.50.
- **mAP@50-95**: Primary benchmark metric; mAP averaged across IoU thresholds from 0.50 to 0.95 in steps of 0.05.

---

## 11. Important Notes & Current Status

- **Zero-Fabrication Policy**: If an image does not contain any trained class above the confidence threshold ($25\%$), the model outputs **"No relevant object detected"** with `0.0%` confidence.
- **Current Status**: The custom fine-tuning and validation pipeline is fully built, tested, and ready. Once an annotated real-world watershed dataset is placed in `datasets/`, run the training command above to produce domain-specific weights.
