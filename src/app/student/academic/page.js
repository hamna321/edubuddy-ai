"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api.js";
import { PageHeader, Spinner, Alert } from "@/components/ui.js";
import RoboConsole from "@/components/RoboConsole.js";

function noteIcon(mimetype) {
  if (mimetype?.includes("pdf")) return "📄";
  if (mimetype?.includes("presentation") || mimetype?.includes("powerpoint")) return "📊";
  return "📝";
}

export default function AcademicPage() {
  const [subjects, setSubjects] = useState(null);
  const [notes, setNotes] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [selected, setSelected] = useState([]); // note ids to focus on ([] = all)
  const [sources, setSources] = useState([]);
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/student/subjects"), api("/api/student/notes")])
      .then(([s, n]) => {
        setSubjects(s.subjects);
        setNotes(n.notes);
        if (s.subjects.length) setSubjectId(String(s.subjects[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  const subjectNotes = useMemo(
    () => notes.filter((n) => String(n.subject_id) === String(subjectId)),
    [notes, subjectId]
  );

  function changeSubject(id) {
    setSubjectId(id);
    setSelected([]);
    setSources([]);
  }

  function toggleNote(id) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function onSend(text, messages) {
    setWarn("");
    const res = await api("/api/student/chat", {
      method: "POST",
      body: {
        subject_id: Number(subjectId),
        messages,
        note_ids: selected.length ? selected : undefined,
      },
    });
    setSources(res.sources || []);
    if (res.noteWarning) setWarn(res.noteWarning);
    return res.reply;
  }

  if (error) return <Alert>{error}</Alert>;
  if (!subjects) return <Spinner />;

  const currentSubject = subjects.find((s) => String(s.id) === String(subjectId));
  const chatKey = `${subjectId}:${selected.join(",")}`;

  return (
    <div>
      <PageHeader title="Academic Help" subtitle="Chat with your class notes — answers tuned to you." />

      {subjects.length === 0 ? (
        <Alert kind="info">You&rsquo;re not enrolled in any subjects yet. Ask your admin to add you to a class.</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="space-y-4 lg:col-span-1">
            <div className="card p-4">
              <label className="label">Subject</label>
              <select className="input" value={subjectId} onChange={(e) => changeSubject(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.class_name}</option>
                ))}
              </select>
            </div>

            <div className="card p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">📎 Notes in {currentSubject?.name}</div>
                {subjectNotes.length > 0 && selected.length > 0 && (
                  <button onClick={() => setSelected([])} className="text-xs text-brand-600 hover:underline">
                    Use all
                  </button>
                )}
              </div>

              {subjectNotes.length === 0 ? (
                <p className="text-xs text-gray-400">No notes uploaded yet for this subject.</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-gray-400">
                    Tick a note to focus answers on it, or open it to read. Nothing ticked = all notes.
                  </p>
                  <ul className="space-y-1.5">
                    {subjectNotes.map((n) => (
                      <li key={n.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 flex-shrink-0 accent-brand-600"
                          checked={selected.includes(n.id)}
                          onChange={() => toggleNote(n.id)}
                          disabled={!n.embedded}
                          title={n.embedded ? "Focus questions on this note" : "This note isn't chat-ready"}
                        />
                        <span className="flex-shrink-0">{noteIcon(n.mimetype)}</span>
                        <a
                          href={`/api/student/notes/${n.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-sm text-gray-700 hover:text-brand-600 hover:underline"
                          title="Open / view this note"
                        >
                          {n.title}
                        </a>
                        {!n.embedded && <span className="text-[10px] text-amber-500">(no chat)</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
                    {selected.length === 0
                      ? "🔎 Answering from all notes in this subject."
                      : `🎯 Focusing on ${selected.length} note${selected.length > 1 ? "s" : ""}.`}
                  </div>
                </>
              )}
            </div>

            {sources.length > 0 && (
              <div className="card p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">🔎 Sources used</div>
                <ul className="space-y-1 text-xs text-gray-500">
                  {sources.map((s, i) => (
                    <li key={i}>• {s.title} <span className="text-gray-400">({s.score})</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            {warn && <div className="mb-3"><Alert kind="info">{warn}</Alert></div>}
            <RoboConsole
              key={chatKey}
              greeting={
                selected.length
                  ? `Hi! Ask me about the ${selected.length} note${selected.length > 1 ? "s" : ""} you picked. 🎯`
                  : `Hi! Ask me anything about ${currentSubject?.name || "your subject"}. 📘`
              }
              placeholder={`Ask about ${currentSubject?.name || "this subject"}…`}
              onSend={onSend}
            />
          </div>
        </div>
      )}
    </div>
  );
}
