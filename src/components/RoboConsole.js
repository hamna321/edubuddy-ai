"use client";

import { useEffect, useRef, useState } from "react";
import RobotStage from "@/components/RobotStage.js";

/**
 * Reusable voice + text chat with the 3D robot.
 *
 * Props:
 *   onSend(text, messages)  async -> string | { reply }   (required)
 *   onUserMessage(text)     optional callback
 *   onAssistantMessage(t)   optional callback
 *   greeting                first assistant bubble
 *   placeholder             text input placeholder
 *   transcribeUrl           default "/api/robot/transcribe"
 */
export default function RoboConsole({
  onSend,
  onUserMessage,
  onAssistantMessage,
  greeting = "Hi! Tap the mic or type to chat 👋",
  placeholder = "Type a message…",
  transcribeUrl = "/api/robot/transcribe",
}) {
  const [messages, setMessages] = useState(() =>
    greeting ? [{ role: "assistant", text: greeting }] : []
  );
  const [robot, setRobot] = useState("idle");
  const [status, setStatus] = useState("Tap the mic or type 🎙️");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micError, setMicError] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);

  const logRef = useRef(null);
  const voiceRef = useRef(true);
  voiceRef.current = voiceOn;
  const historyRef = useRef(messages);
  historyRef.current = messages;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ---- Text to speech ----------------------------------------------------
  const voice = useRef(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const pick = () => {
      const vs = window.speechSynthesis.getVoices();
      voice.current =
        vs.find((v) => /Google US English|Microsoft Aria|Samantha/.test(v.name)) ||
        vs.find((v) => v.lang.startsWith("en")) || vs[0] || null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  function speak(t) {
    if (!("speechSynthesis" in window) || !voiceRef.current) {
      setRobot("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    if (voice.current) u.voice = voice.current;
    u.rate = 1.02; u.pitch = 1.1;
    u.onstart = () => { setRobot("speaking"); setStatus("Robo is talking…"); };
    u.onend = () => { setRobot("idle"); setStatus("Tap the mic or type 🎙️"); };
    u.onerror = () => setRobot("idle");
    window.speechSynthesis.speak(u);
  }

  // ---- Send --------------------------------------------------------------
  async function send(userText) {
    const t = (userText || "").trim();
    if (!t || busy) return;
    const next = [...historyRef.current, { role: "user", text: t }];
    setMessages(next);
    onUserMessage?.(t);
    setBusy(true);
    setRobot("thinking");
    setStatus("Robo is thinking…");
    try {
      const res = await onSend(t, next);
      const reply = (typeof res === "string" ? res : res?.reply) || "Hmm, I'm not sure.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      onAssistantMessage?.(reply);
      speak(reply);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "⚠ " + e.message }]);
      setRobot("idle");
      setStatus("⚠ " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Microphone → WAV → transcribe ------------------------------------
  const rec = useRef({ mr: null, chunks: [], stream: null });

  async function startRec() {
    if (busy || recording || connecting) return;
    setMicError("");

    if (!window.isSecureContext) {
      setMicError(
        "Your browser only allows the microphone over https or http://localhost. Open the app at http://localhost:3000 (not a 127.0.0.1 / LAN address), or just type below."
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMicError("This browser doesn't support in-page recording. Please type your message instead.");
      return;
    }

    // Immediate feedback so the button never feels dead while the browser's
    // permission prompt is open.
    setConnecting(true);
    setStatus("Allow the microphone when your browser asks…");
    window.speechSynthesis?.cancel();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setConnecting(false);
      setStatus("Tap the mic or type 🎙️");
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError")
        setMicError("Microphone blocked. Click the camera/🔒 icon in the address bar → allow Microphone → try again. (Or just type.)");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError")
        setMicError("No microphone was found on this device. You can type instead.");
      else
        setMicError("Couldn't start the microphone. You can type your message instead.");
      return;
    }

    setConnecting(false);
    const mr = new MediaRecorder(stream);
    rec.current = { mr, chunks: [], stream };
    mr.ondataavailable = (e) => e.data.size && rec.current.chunks.push(e.data);
    mr.onstop = onStopped;
    mr.start();
    setRecording(true);
    setRobot("listening");
    setStatus("Listening… tap again when done");
  }

  function stopRec() {
    if (!recording) return;
    setRecording(false);
    try { rec.current.mr.stop(); } catch {}
    rec.current.stream?.getTracks().forEach((t) => t.stop());
  }

  async function onStopped() {
    const { chunks, mr } = rec.current;
    const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
    if (blob.size < 1200) { setRobot("idle"); setStatus("Didn't catch that."); return; }
    setRobot("thinking");
    setStatus("Transcribing…");
    try {
      const wav = await blobToWavBase64(blob);
      const r = await fetch(transcribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: wav, mime: "audio/wav" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Transcription failed");
      const t = (data.text || "").trim();
      if (!t) { setRobot("idle"); setStatus("I didn't hear words — try again."); return; }
      send(t);
    } catch (e) {
      setRobot("idle");
      setStatus("⚠ " + e.message);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="relative bg-gradient-to-b from-brand-50 to-white">
        <div className="h-56 sm:h-64">
          <RobotStage state={robot} />
        </div>
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <span className="badge bg-white/80 text-gray-600 shadow-sm backdrop-blur">{status}</span>
        </div>
      </div>

      <div ref={logRef} className="max-h-72 space-y-2 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); const t = text; setText(""); send(t); }}
        className="flex items-center gap-2 border-t border-[var(--border)] p-3"
      >
        <button
          type="button"
          onClick={() => (recording ? stopRec() : startRec())}
          disabled={busy}
          aria-label={recording ? "Stop recording" : "Talk to Robo"}
          className={`flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition disabled:opacity-50 ${
            recording ? "bg-red-500 animate-pulse" : connecting ? "bg-amber-500 animate-pulse" : "bg-brand-600 hover:bg-brand-700 active:scale-95"
          }`}
          title={recording ? "Tap to stop" : "Talk to Robo"}
        >
          {connecting ? "…" : recording ? "⏹️" : "🎙️"}
        </button>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => setVoiceOn((v) => !v)}
          className="btn-ghost !px-2.5 flex-shrink-0 cursor-pointer"
          title="Toggle Robo's voice"
        >
          {voiceOn ? "🔊" : "🔇"}
        </button>
        <button className="btn-primary flex-shrink-0" disabled={busy || !text.trim()}>Send</button>
      </form>

      {micError && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          🎙️ {micError}
        </div>
      )}
    </div>
  );
}

// --- Convert recorded audio to 16 kHz mono WAV (Whisper-friendly) ----------
async function blobToWavBase64(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const audioBuf = await ctx.decodeAudioData(arrayBuf);
  ctx.close();
  const len = audioBuf.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < audioBuf.numberOfChannels; c++) {
    const d = audioBuf.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += d[i] / audioBuf.numberOfChannels;
  }
  const rate = 16000;
  const ratio = audioBuf.sampleRate / rate;
  const outLen = Math.max(1, Math.round(len / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio, i0 = Math.floor(idx), i1 = Math.min(i0 + 1, len - 1);
    out[i] = mono[i0] + (mono[i1] - mono[i0]) * (idx - i0);
  }
  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); view.setUint32(4, 36 + out.length * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); ws(36, "data"); view.setUint32(40, out.length * 2, true);
  let off = 44;
  for (let i = 0; i < out.length; i++) {
    const s = Math.max(-1, Math.min(1, out[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  const wavBlob = new Blob([view], { type: "audio/wav" });
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(wavBlob);
  });
}
