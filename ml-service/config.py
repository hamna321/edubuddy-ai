"""Shared paths & config for the EduBuddy ML service."""
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent

# Resource folders shipped with the project.
DISTILBERT_DIR = PROJECT_ROOT / "distilbert_emotion"
EMOTION_DATASET = DISTILBERT_DIR / "emotion_sentimen_dataset.csv"
GRADE_DATASET = PROJECT_ROOT / "performance_prediction" / "Student_performance_data.csv"

# Where trained artifacts live.
MODELS_DIR = HERE / "models"
MODELS_DIR.mkdir(exist_ok=True)
GRADE_MODEL = MODELS_DIR / "grade_xgb.json"
GRADE_META = MODELS_DIR / "grade_meta.json"
EMOTION_LABELS = MODELS_DIR / "emotion_labels.json"

# Optional shared secret (must match the web app's ML_SERVICE_KEY). Empty = open.
API_KEY = os.environ.get("ML_SERVICE_KEY", "")
PORT = int(os.environ.get("ML_PORT", "5000"))
HF_MODEL_ID = os.environ.get("HF_MODEL_ID", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

# Feature order the grade model expects (mirrors web/src/lib/gradeSchema.js).
GRADE_FEATURES = [
    "Age", "Gender", "Ethnicity", "ParentalEducation", "StudyTimeWeekly",
    "Absences", "Tutoring", "ParentalSupport", "Extracurricular", "Sports",
    "Music", "Volunteering",
]
GRADE_LABELS = {0: "A", 1: "B", 2: "C", 3: "D", 4: "F"}
# Representative GPA midpoint per grade band, used to estimate a GPA number.
GRADE_GPA_MID = {0: 3.75, 1: 3.25, 2: 2.75, 3: 2.25, 4: 1.0}

# Emotions treated as "needs attention" -> surfaced to teachers.
NEGATIVE_EMOTIONS = {"sadness", "hate", "anger", "worry", "empty", "boredom", "fear"}

# Fallback id->name mapping (alphabetical) if calibration hasn't been run.
FALLBACK_EMOTION_ORDER = [
    "anger", "boredom", "empty", "enthusiasm", "fun", "happiness", "hate",
    "love", "neutral", "relief", "sadness", "surprise", "worry",
]
