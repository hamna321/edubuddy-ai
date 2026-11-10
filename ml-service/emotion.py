
"""EduBuddy emotion classifier using the fine-tuned DistilBERT ONNX INT8 model."""

import json
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

import config

_tokenizer = None
_session = None
_id2label = None


def _label_map():
    global _id2label

    if _id2label is not None:
        return _id2label

    if config.EMOTION_LABELS.exists():
        raw = json.loads(config.EMOTION_LABELS.read_text(encoding="utf-8"))
        _id2label = {int(k): v for k, v in raw.items()}
    else:
        _id2label = {
            i: name
            for i, name in enumerate(config.FALLBACK_EMOTION_ORDER)
        }

    return _id2label


def _model_dir():
    return config.MODELS_DIR / "emotion_onnx"


def is_ready() -> bool:
    model_dir = _model_dir()

    required_files = [
        model_dir / "model_int8.onnx",
        model_dir / "tokenizer.json",
        model_dir / "tokenizer_config.json",
        model_dir / "config.json",
    ]

    return all(path.exists() for path in required_files)


def _load():
    global _tokenizer, _session

    if _session is not None:
        return

    print("EMOTION: Starting model loading...", flush=True)

    if not is_ready():
        raise RuntimeError(
            "ONNX emotion model files are missing from models/emotion_onnx."
        )

    model_dir = _model_dir()

    print("EMOTION: Loading tokenizer...", flush=True)

    _tokenizer = AutoTokenizer.from_pretrained(
        str(model_dir),
        local_files_only=True,
    )

    print("EMOTION: Tokenizer loaded.", flush=True)

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1

    print("EMOTION: Creating ONNX session...", flush=True)

    _session = ort.InferenceSession(
        str(model_dir / "model_int8.onnx"),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )

    print("EMOTION: ONNX session loaded successfully!", flush=True)


def _predict_probs(text: str) -> np.ndarray:
    _load()

    inputs = _tokenizer(
        text,
        return_tensors="np",
        truncation=True,
        max_length=256,
    )

    feed = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64),
    }

    logits = _session.run(["logits"], feed)[0][0]

    # Numerically stable softmax
    logits = logits - np.max(logits)
    exp = np.exp(logits)

    return exp / np.sum(exp)


def classify(text: str) -> dict:
    """Classify a single text blob into a dominant emotion and severity."""

    text = (text or "").strip()

    if not text:
        return {
            "emotion": "neutral",
            "score": 0.0,
            "severity": "info",
            "scores": {},
        }

    probs = _predict_probs(text)
    labels = _label_map()

    top = int(np.argmax(probs))
    emotion = labels.get(top, f"LABEL_{top}")
    score = float(probs[top])

    severity = (
        "concern"
        if emotion in config.NEGATIVE_EMOTIONS
        else "info"
    )

    scores = {
        labels.get(i, f"LABEL_{i}"): round(float(p), 4)
        for i, p in enumerate(probs)
    }

    return {
        "emotion": emotion,
        "score": round(score, 4),
        "severity": severity,
        "scores": scores,
    }


def classify_conversation(
    messages: list[str],
    threshold: float = 0.5,
) -> dict:
    """Aggregate student emotions using the existing max-concern rule."""

    texts = [
        m.strip()
        for m in (messages or [])
        if m and m.strip()
    ]

    if not texts:
        return {
            "emotion": "neutral",
            "score": 0.0,
            "severity": "info",
            "scores": {},
            "evidence": None,
        }

    labels = _label_map()
    per = []
    mean = None

    for text in texts:
        probs = _predict_probs(text)

        mean = probs.copy() if mean is None else mean + probs

        top = int(np.argmax(probs))

        per.append((
            labels.get(top, f"LABEL_{top}"),
            float(probs[top]),
            text,
            probs,
        ))

    mean = mean / len(texts)

    def pack(emotion, score, text, probs, severity):
        return {
            "emotion": emotion,
            "score": round(float(score), 4),
            "severity": severity,
            "scores": {
                labels.get(i, f"LABEL_{i}"): round(float(v), 4)
                for i, v in enumerate(probs)
            },
            "evidence": text,
        }

    concerns = [
        item for item in per
        if item[0] in config.NEGATIVE_EMOTIONS
        and item[1] >= threshold
    ]

    if concerns:
        concerns.sort(key=lambda item: item[1], reverse=True)
        emotion, score, text, probs = concerns[0]

        return pack(emotion, score, text, probs, "concern")

    strong = [
        item for item in per
        if item[0] != "neutral"
        and item[1] >= threshold
    ]

    if strong:
        strong.sort(key=lambda item: item[1], reverse=True)
        emotion, score, text, probs = strong[0]

        return pack(emotion, score, text, probs, "info")

    top = int(np.argmax(mean))

    return pack(
        labels.get(top, f"LABEL_{top}"),
        float(mean[top]),
        None,
        mean,
        "info",
    )
