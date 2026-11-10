"""Grade prediction: load the trained XGBoost model and predict a grade band."""
import json
import numpy as np
from xgboost import XGBClassifier

import config

_model = None
_meta = None


def _load():
    global _model, _meta
    if _model is not None:
        return
    if not config.GRADE_MODEL.exists():
        raise FileNotFoundError(
            "Grade model not trained yet. Run:  python train_grade.py"
        )
    m = XGBClassifier()
    m.load_model(str(config.GRADE_MODEL))
    _model = m
    _meta = json.loads(config.GRADE_META.read_text()) if config.GRADE_META.exists() else {}


def is_ready() -> bool:
    return config.GRADE_MODEL.exists()


def predict(features: dict) -> dict:
    _load()
    vec = np.array([[float(features.get(k, 0)) for k in config.GRADE_FEATURES]], dtype=float)
    probs = _model.predict_proba(vec)[0]
    gradeclass = int(np.argmax(probs))
    confidence = float(probs[gradeclass])
    gpa_estimate = float(sum(config.GRADE_GPA_MID[i] * float(p) for i, p in enumerate(probs)))
    return {
        "gradeclass": gradeclass,
        "letter": config.GRADE_LABELS[gradeclass],
        "confidence": confidence,
        "gpa_estimate": round(gpa_estimate, 2),
        "probabilities": {config.GRADE_LABELS[i]: round(float(p), 4) for i, p in enumerate(probs)},
    }
