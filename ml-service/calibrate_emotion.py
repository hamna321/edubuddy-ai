"""
Reconstruct the DistilBERT id->emotion-name mapping.

The shipped config.json only has generic LABEL_0..12. We recover the real names
by sampling labelled rows from the training dataset, running them through the
model, and assigning each model output-id to the emotion its samples most often
produce. Writes models/emotion_labels.json.

Run:  python calibrate_emotion.py
"""
import csv
import json
import random
from collections import defaultdict, Counter

import numpy as np

import config
import emotion as emo


PER_EMOTION = 60  # samples per emotion


def load_samples():
    buckets = defaultdict(list)
    with open(config.EMOTION_DATASET, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            e = row.get("Emotion", "").strip()
            t = row.get("text", "").strip()
            if e and t and len(buckets[e]) < PER_EMOTION * 4:
                buckets[e].append(t)
    samples = {}
    for e, texts in buckets.items():
        random.shuffle(texts)
        samples[e] = texts[:PER_EMOTION]
    return samples


def main():
    random.seed(7)
    print("Loading samples from dataset…")
    samples = load_samples()
    print(f"Emotions: {list(samples.keys())}")

    emo._load()  # warm the model

    # For each true emotion, tally which model id it predicts most.
    votes = defaultdict(Counter)   # true_emotion -> Counter(pred_id)
    for true_emo, texts in samples.items():
        for t in texts:
            probs = emo._predict_probs(t)
            votes[true_emo][int(np.argmax(probs))] += 1
        best_id, best_n = votes[true_emo].most_common(1)[0]
        print(f"  {true_emo:12s} -> id {best_id} ({best_n}/{len(texts)})")

    # Assign each true emotion to its top id, resolving collisions by vote count.
    claims = []  # (count, emotion, id)
    for e, ctr in votes.items():
        for pid, n in ctr.items():
            claims.append((n, e, pid))
    claims.sort(reverse=True)

    id2label = {}
    used_emotions = set()
    for n, e, pid in claims:
        if pid in id2label or e in used_emotions:
            continue
        id2label[pid] = e
        used_emotions.add(e)

    # Fill any gaps with leftover emotions / fallback names.
    leftover = [e for e in samples if e not in used_emotions]
    for pid in range(13):
        if pid not in id2label:
            id2label[pid] = leftover.pop(0) if leftover else config.FALLBACK_EMOTION_ORDER[pid]

    ordered = {str(i): id2label[i] for i in range(13)}
    config.EMOTION_LABELS.write_text(json.dumps(ordered, indent=2))
    print("\nFinal mapping:")
    for i in range(13):
        print(f"  LABEL_{i} = {ordered[str(i)]}")
    print(f"\nSaved -> {config.EMOTION_LABELS}")


if __name__ == "__main__":
    main()
