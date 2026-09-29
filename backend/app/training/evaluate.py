import os
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from ultralytics import YOLO
from app.training.validator import DatasetValidator

class ClassMetric(BaseModel):
    class_id: int
    class_name: str
    precision: float = 0.0
    recall: float = 0.0
    map50: float = 0.0
    map50_95: float = 0.0

class EvaluationReport(BaseModel):
    weights_path: str
    dataset_yaml: str
    split_evaluated: str # "val" | "test"
    overall_precision: float = 0.0
    overall_recall: float = 0.0
    overall_map50: float = 0.0
    overall_map50_95: float = 0.0
    class_metrics: List[ClassMetric] = Field(default_factory=list)
    speed_ms: Dict[str, float] = Field(default_factory=dict)
    summary_text: Optional[str] = None

    def print_table(self) -> str:
        lines = []
        lines.append("=" * 75)
        lines.append(f"BHUVERSE MODEL EVALUATION REPORT ({self.split_evaluated.upper()} SPLIT)")
        lines.append("=" * 75)
        lines.append(f"Model Checkpoint : {self.weights_path}")
        lines.append(f"Dataset YAML     : {self.dataset_yaml}")
        lines.append(f"Split Evaluated  : {self.split_evaluated.upper()}")
        lines.append("-" * 75)
        lines.append(f"{'CLASS':<25} {'PRECISION':<12} {'RECALL':<12} {'mAP@50':<12} {'mAP@50-95':<12}")
        lines.append("-" * 75)
        lines.append(
            f"{'ALL CLASSES (Overall)':<25} "
            f"{self.overall_precision:<12.4f} "
            f"{self.overall_recall:<12.4f} "
            f"{self.overall_map50:<12.4f} "
            f"{self.overall_map50_95:<12.4f}"
        )
        lines.append("-" * 75)
        for cm in self.class_metrics:
            lines.append(
                f"{cm.class_name:<25} "
                f"{cm.precision:<12.4f} "
                f"{cm.recall:<12.4f} "
                f"{cm.map50:<12.4f} "
                f"{cm.map50_95:<12.4f}"
            )
        lines.append("=" * 75)
        if self.speed_ms:
            lines.append("Inference Speed:")
            for k, v in self.speed_ms.items():
                lines.append(f"  • {k}: {v:.2f} ms")
            lines.append("=" * 75)
        return "\n".join(lines)

class ModelEvaluator:
    """
    Evaluates fine-tuned YOLO checkpoints on validation or test splits.
    Extracts authentic Ultralytics evaluation metrics without fabrication.
    """

    @classmethod
    def evaluate(
        cls,
        weights_path: str,
        dataset_yaml: str,
        split: str = "val",
        image_size: int = 640,
        device: str = "auto",
        batch_size: int = 16
    ) -> EvaluationReport:
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Model weights not found: {weights_path}")
        if not os.path.exists(dataset_yaml):
            raise FileNotFoundError(f"Dataset YAML not found: {dataset_yaml}")

        _, class_names = DatasetValidator.parse_data_yaml(dataset_yaml)

        model = YOLO(weights_path)

        import torch
        actual_device = "0" if (device in ("auto", "cuda") and torch.cuda.is_available()) or device == "0" else "cpu"

        # Execute Ultralytics validation / test pass
        val_results = model.val(
            data=dataset_yaml,
            split=split,
            imgsz=image_size,
            batch=batch_size,
            device=actual_device,
            verbose=False
        )

        metrics = val_results.results_dict if hasattr(val_results, "results_dict") else {}
        box_metrics = val_results.box if hasattr(val_results, "box") else None

        overall_p = float(metrics.get("metrics/precision(B)", 0.0))
        overall_r = float(metrics.get("metrics/recall(B)", 0.0))
        overall_map50 = float(metrics.get("metrics/mAP50(B)", 0.0))
        overall_map50_95 = float(metrics.get("metrics/mAP50-95(B)", 0.0))

        class_metrics_list = []
        if box_metrics is not None:
            # Per-class metrics
            p_per_class = box_metrics.p if hasattr(box_metrics, "p") else []
            r_per_class = box_metrics.r if hasattr(box_metrics, "r") else []
            map50_per_class = box_metrics.ap50 if hasattr(box_metrics, "ap50") else []
            map_all_per_class = box_metrics.ap if hasattr(box_metrics, "ap") else []

            for idx, name in class_names.items():
                p = float(p_per_class[idx]) if idx < len(p_per_class) else 0.0
                r = float(r_per_class[idx]) if idx < len(r_per_class) else 0.0
                m50 = float(map50_per_class[idx]) if idx < len(map50_per_class) else 0.0
                m_all = float(map_all_per_class[idx]) if idx < len(map_all_per_class) else 0.0

                class_metrics_list.append(ClassMetric(
                    class_id=idx,
                    class_name=name,
                    precision=p,
                    recall=r,
                    map50=m50,
                    map50_95=m_all
                ))

        speed = val_results.speed if hasattr(val_results, "speed") else {}

        report = EvaluationReport(
            weights_path=weights_path,
            dataset_yaml=dataset_yaml,
            split_evaluated=split,
            overall_precision=overall_p,
            overall_recall=overall_r,
            overall_map50=overall_map50,
            overall_map50_95=overall_map50_95,
            class_metrics=class_metrics_list,
            speed_ms=speed
        )

        return report
