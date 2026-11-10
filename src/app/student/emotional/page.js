"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api.js";
import { PageHeader, Spinner, Alert } from "@/components/ui.js";
import RoboConsole from "@/components/RoboConsole.js";
import CameraEmotion from "@/components/CameraEmotion.js";

export default function EmotionalPage() {
  const [subjects, setSubjects] = useState(null);
  const [subjectId, setSubjectId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [feeling, setFeeling] = useState(null);
  const [error, setError] = useState("");
  const userMsgs = useRef([]);

  useEffect(() => {
    api("/api/student/subjects").then((s) => setSubjects(s.subjects)).catch((e) => setError(e.message));
  }, []);

  async function onSend(text, messages) {
    const res = await api("/api/robot/chat", { method: "POST", body: { messages } });
    return res.reply;
  }

  async function analyze() {
    if (userMsgs.current.length === 0) {
      setFeeling({ severity: "info", text: "Say a little about how you're feeling first 💬" });
      return;
    }
    setAnalyzing(true);
    setFeeling(null);
    try {
      const res = await api("/api/student/emotion", {
        method: "POST",
        body: { source: "text", messages: userMsgs.current, subject_id: subjectId || null },
      });
      if (res.severity === "concern") {
        setFeeling({
          severity: "concern",
          text: `It sounds like you're feeling ${res.emotion}. That's completely okay — I've gently let a teacher know so someone can support you. You matter 💛`,
        });
      } else {
        setFeeling({
          severity: "info",
          text: `Thanks for sharing. You seem ${res.emotion}. I'm always here if you want to talk more 🙂`,
        });
      }
    } catch (e) {
      setFeeling({ severity: "error", text: e.message });
    } finally {
      setAnalyzing(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!subjects) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Emotional Support"
        subtitle="Robo is here to listen. A camera check-in or a chat — whatever feels right."
      />

      <div className="mb-5 card p-4">
        <label className="label">Which class is this about? (optional)</label>
        <select className="input max-w-md" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">General — not about a subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.class_name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          This helps route a wellbeing note to the right teacher if you need support.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <CameraEmotion subjectId={subjectId ? Number(subjectId) : null} />
        </div>

        <div className="space-y-3">
          <RoboConsole
            greeting="Hey, I'm Robo. How are you feeling today? You can talk or type — I'm listening. 💛"
            placeholder="Tell me what's on your mind…"
            onSend={onSend}
            onUserMessage={(t) => userMsgs.current.push(t)}
          />

          {feeling && (
            <Alert kind={feeling.severity === "concern" ? "info" : feeling.severity === "error" ? "error" : "success"}>
              {feeling.text}
            </Alert>
          )}

          <button onClick={analyze} disabled={analyzing} className="btn-ghost w-full">
            {analyzing ? "Checking in…" : "💬 Check how I'm feeling from our chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
