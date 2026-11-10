# EduBuddy ML Service

FastAPI service providing the two AI models the web app calls over HTTP.

| Endpoint | Model | Purpose |
|---|---|---|
| `POST /predict-grade` | XGBoost | Predict a student's grade band (A–F) from their profile |
| `POST /emotion-text` | DistilBERT | Detect emotion from a student's chat text |
| `GET /health` | — | Readiness of both models |

## Setup

```bash
pip install -r requirements.txt
python train_grade.py        # -> models/grade_xgb.json  (+ grade_meta.json)
python calibrate_emotion.py  # -> models/emotion_labels.json  (recovers label names)
python app.py                # http://localhost:5000
```

`torch`, `pandas`, `numpy`, `fastapi`, `uvicorn`, `safetensors` are often already
present; only `transformers`, `xgboost`, `scikit-learn`, `joblib` may need installing.

## Why `calibrate_emotion.py`?

The shipped `distilbert_emotion/config.json` only has generic `LABEL_0..12`. The script
samples labelled rows from the dataset, runs them through the model, and recovers the real
mapping (it comes out as alphabetical: `anger, boredom, empty, enthusiasm, fun, happiness,
hate, love, neutral, relief, sadness, surprise, worry`). Result is cached in
`models/emotion_labels.json`.

## Notes on behaviour

- **Grades:** trained on the 12 profile columns (StudentID/GPA/GradeClass excluded to avoid
  leakage). ~69% test accuracy; strongest signal is *Absences*, then *Tutoring* and
  *ParentalSupport*. Returns the band, a confidence, a GPA estimate and per-class probabilities.
- **Emotion:** this fine-tuned model is heavily *neutral*-biased, so for a conversation we
  use a **max-concern** rule — if any single message clearly reads as a negative emotion the
  whole conversation is flagged (with that message kept as evidence). Subtle/implicit worry
  may still read as neutral; that's a property of the provided model.

## Request examples

```bash
curl -s localhost:5000/predict-grade -H "Content-Type: application/json" -d '{
  "features": {"Age":16,"Gender":1,"Ethnicity":0,"ParentalEducation":4,"StudyTimeWeekly":18,
  "Absences":1,"Tutoring":1,"ParentalSupport":4,"Extracurricular":1,"Sports":1,"Music":1,"Volunteering":1}}'

curl -s localhost:5000/emotion-text -H "Content-Type: application/json" \
  -d '{"messages":["school is stressful","i hate my life"]}'
```

## Optional auth

Set `ML_SERVICE_KEY` in this process's environment to require an `x-api-key` header (must
match the web app's `ML_SERVICE_KEY`). Left unset, the service is open (fine for local dev).
