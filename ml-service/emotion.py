"""DistilBERT text-emotion classifier (loads the fine-tuned model in
../distilbert_emotion). Maps the model's LABEL_0..12 outputs to real emotion
names via models/emotion_labels.json (built by calibrate_emotion.py)."""
import json
import numpy as np

import config

_tokenizer = None
_model = None
_torch = None
_id2label = None


def _label_map():
    global _id2label
    if _id2label is not None:
        return _id2label
    if config.EMOTION_LABELS.exists():
        raw = json.loads(config.EMOTION_LABELS.read_text())
        _id2label = {int(k): v for k, v in raw.items()}
    else:
        _id2label = {i: name for i, name in enumerate(config.FALLBACK_EMOTION_ORDER)}
    return _id2label


def _load():
    global _tokenizer, _model, _torch
    if _model is not None:
        return

    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification

    _torch = torch

    # Use Hugging Face in production, or the local model during development.
    source = config.HF_MODEL_ID if config.HF_MODEL_ID else str(config.DISTILBERT_DIR)
    load_kwargs = {"token": config.HF_TOKEN} if config.HF_TOKEN else {}

    _tokenizer = AutoTokenizer.from_pretrained(source, **load_kwargs)
    _model = AutoModelForSequenceClassification.from_pretrained(source, **load_kwargs)
    _model.eval()

def is_ready() -> bool:
    if config.HF_MODEL_ID and config.HF_TOKEN:
        return True
    return (config.DISTILBERT_DIR / "model.safetensors").exists()

def _predict_probs(text: str) -> np.ndarray:
    _load()
    inputs = _tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    with _torch.no_grad():
        logits = _model(**inputs).logits
    return _torch.softmax(logits, dim=-1)[0].cpu().numpy()


def classify(text: str) -> dict:
    """Classify a single text blob -> dominant emotion + severity."""
    text = (text or "").strip()
    if not text:
        return {"emotion": "neutral", "score": 0.0, "severity": "info", "scores": {}}

    probs = _predict_probs(text)
    labels = _label_map()
    top = int(np.argmax(probs))
    emotion = labels.get(top, f"LABEL_{top}")
    score = float(probs[top])
    severity = "concern" if emotion in config.NEGATIVE_EMOTIONS else "info"
    scores = {labels.get(i, f"LABEL_{i}"): round(float(p), 4) for i, p in enumerate(probs)}
    return {"emotion": emotion, "score": round(score, 4), "severity": severity, "scores": scores}


def classify_conversation(messages: list[str], threshold: float = 0.5) -> dict:
    """Aggregate emotion across a student's messages using a *max-concern* rule.

    This fine-tuned model is heavily neutral-biased, so averaging drowns out a
    single distress signal. For a wellbeing feature we instead surface the
    strongest concerning message: if any message clearly reads as a negative
    emotion we flag the whole conversation as that emotion (and keep the
    triggering message as evidence for the teacher). Otherwise we report the
    strongest non-neutral emotion, falling back to neutral."""
    texts = [m for m in (messages or []) if m and m.strip()]
    if not texts:
        return {"emotion": "neutral", "score": 0.0, "severity": "info", "scores": {}, "evidence": None}

    labels = _label_map()
    per = []  # (emotion, score, text, probs)
    mean = None
    for t in texts:
        p = _predict_probs(t)
        mean = p if mean is None else mean + p
        top = int(np.argmax(p))
        per.append((labels.get(top, f"LABEL_{top}"), float(p[top]), t, p))
    mean = mean / len(texts)

    def pack(emotion, score, text, probs, severity):
        return {
            "emotion": emotion,
            "score": round(float(score), 4),
            "severity": severity,
            "scores": {labels.get(i, f"LABEL_{i}"): round(float(v), 4) for i, v in enumerate(probs)},
            "evidence": text,
        }

    concerns = [x for x in per if x[0] in config.NEGATIVE_EMOTIONS and x[1] >= threshold]
    if concerns:
        concerns.sort(key=lambda x: x[1], reverse=True)
        e, s, t, p = concerns[0]
        return pack(e, s, t, p, "concern")

    strong = [x for x in per if x[0] != "neutral" and x[1] >= threshold]
    if strong:
        strong.sort(key=lambda x: x[1], reverse=True)
        e, s, t, p = strong[0]
        return pack(e, s, t, p, "info")

    top = int(np.argmax(mean))
    return pack(labels.get(top, f"LABEL_{top}"), float(mean[top]), None, mean, "info")
