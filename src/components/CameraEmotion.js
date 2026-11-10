"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api.js";

// face-api expression -> friendly label / emoji
const EMO = {
  happy: { emoji: "😊", label: "happy", good: true },
  neutral: { emoji: "😐", label: "okay", good: true },
  surprised: { emoji: "😮", label: "surprised", good: true },
  sad: { emoji: "😢", label: "sad", good: false },
  angry: { emoji: "😠", label: "angry", good: false },
  fearful: { emoji: "😨", label: "anxious", good: false },
  disgusted: { emoji: "😖", label: "upset", good: false },
};

let faceapiPromise = null;
function loadFaceApi() {
  if (window.faceapi) return Promise.resolve(window.faceapi);
  if (faceapiPromise) return faceapiPromise;
  faceapiPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/face-api.js";
    s.onload = () => resolve(window.faceapi);
    s.onerror = () => reject(new Error("Could not load the vision library."));
    document.head.appendChild(s);
  });
  return faceapiPromise;
}

export default function CameraEmotion({ subjectId, onFallback }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | scanning | done | error
  const [modelsReady, setModelsReady] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Preload the models once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const faceapi = await loadFaceApi();
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        if (!cancelled) setModelsReady(true);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function scan() {
    setError("");
    setResult(null);
    setPhase("loading");
    const faceapi = window.faceapi;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    } catch {
      setPhase("error");
      setError("Camera unavailable or blocked. You can chat with Robo below instead.");
      onFallback?.();
      return;
    }
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play().catch(() => {});
    setPhase("scanning");

    const totals = {};
    let frames = 0;
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const det = await faceapi.detectSingleFace(video, opts).withFaceExpressions();
      if (det?.expressions) {
        frames++;
        for (const [k, v] of Object.entries(det.expressions)) totals[k] = (totals[k] || 0) + v;
      }
      await new Promise((r) => setTimeout(r, 350));
    }

    // stop camera
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;

    if (frames === 0) {
      setPhase("error");
      setError("I couldn't see your face clearly. Let's chat instead — I'm here for you.");
      onFallback?.();
      return;
    }

    // dominant averaged expression
    let best = "neutral", bestVal = -1;
    for (const [k, v] of Object.entries(totals)) {
      if (v > bestVal) { bestVal = v; best = k; }
    }
    const score = bestVal / frames;
    const info = EMO[best] || { emoji: "🙂", label: best, good: true };

    // report to backend (only concerning emotions create a teacher alert)
    let reported = false;
    try {
      const res = await api("/api/student/emotion", {
        method: "POST",
        body: { source: "camera", emotion: best, score, subject_id: subjectId || null },
      });
      reported = res.reported;
    } catch {
      /* non-fatal */
    }

    setResult({ ...info, score, reported });
    setPhase("done");
    if (!info.good) onFallback?.();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">📷</span>
        <h3 className="font-semibold text-gray-900">Camera check-in</h3>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Let Robo look at your face for a few seconds to sense how you&rsquo;re feeling. Nothing is
        recorded — only the detected feeling is used.
      </p>

      <div className="relative mt-4 overflow-hidden rounded-xl bg-gray-900" style={{ aspectRatio: "4 / 3" }}>
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {phase !== "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/40">
            {phase === "done" && result ? result.emoji : "📷"}
          </div>
        )}
        {phase === "scanning" && (
          <div className="absolute inset-x-0 bottom-2 text-center text-xs text-white/80">Reading your expression…</div>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p>}

      {phase === "done" && result && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${result.good ? "bg-emerald-50 text-emerald-700" : "bg-pink-50 text-pink-700"}`}>
          You seem <b>{result.label}</b> {result.emoji}{" "}
          {result.good
            ? "— glad you're doing okay!"
            : result.reported
              ? "— I've gently let a teacher know so someone can check in. You're not alone 💛"
              : "— I'm here to talk whenever you're ready 💛"}
        </div>
      )}

      <button
        onClick={scan}
        disabled={!modelsReady || phase === "scanning" || phase === "loading"}
        className="btn-primary mt-4 w-full"
      >
        {!modelsReady ? "Loading vision…" : phase === "scanning" ? "Scanning…" : phase === "done" ? "Scan again" : "Start camera check"}
      </button>
    </div>
  );
}
