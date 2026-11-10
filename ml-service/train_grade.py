"""
Train the XGBoost grade predictor on performance_prediction/Student_performance_data.csv.

Target:   GradeClass (0=A, 1=B, 2=C, 3=D, 4=F)
Features: everything except StudentID (identifier), GPA & GradeClass (targets/leakage).

Run:  python train_grade.py
Saves: models/grade_xgb.json + models/grade_meta.json
"""
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

import config


def main():
    if not config.GRADE_DATASET.exists():
        raise SystemExit(f"Dataset not found: {config.GRADE_DATASET}")

    df = pd.read_csv(config.GRADE_DATASET)
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

    X = df[config.GRADE_FEATURES].astype(float)
    y = df["GradeClass"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.06,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        num_class=5,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\nTest accuracy: {acc:.4f}\n")
    print(classification_report(y_test, preds, target_names=[config.GRADE_LABELS[i] for i in range(5)]))

    model.save_model(str(config.GRADE_MODEL))
    importances = dict(zip(config.GRADE_FEATURES, [float(v) for v in model.feature_importances_]))
    meta = {
        "features": config.GRADE_FEATURES,
        "labels": config.GRADE_LABELS,
        "accuracy": float(acc),
        "n_rows": int(len(df)),
        "importances": importances,
    }
    config.GRADE_META.write_text(json.dumps(meta, indent=2))
    print(f"\nSaved model -> {config.GRADE_MODEL}")
    print(f"Saved meta  -> {config.GRADE_META}")
    top = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:5]
    print("Top features:", ", ".join(f"{k} ({v:.2f})" for k, v in top))


if __name__ == "__main__":
    main()
