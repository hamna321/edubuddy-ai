"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api.js";
import { Modal, Alert, Spinner } from "@/components/ui.js";
import GradeForm from "@/components/GradeForm.js";
import { GRADE_LABELS, GRADE_MEANING, GRADE_TINT } from "@/lib/gradeSchema.js";

export default function SubjectPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("students");

  async function load() {
    try {
      setData(await api(`/api/teacher/subjects/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;
  const { subject, students, notes } = data;

  return (
    <div>
      <div className="mb-6">
        <Link href="/teacher" className="text-sm text-brand-600 hover:underline">← My teaching</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">📚 {subject.name}</h1>
        <p className="text-sm text-gray-500">{subject.class_name}</p>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <TabBtn active={tab === "students"} onClick={() => setTab("students")}>
          🧑‍🎓 Students &amp; Grades ({students.length})
        </TabBtn>
        <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>
          📎 Notes ({notes.length})
        </TabBtn>
      </div>

      {tab === "students" ? (
        <StudentsPanel students={students} onChange={load} />
      ) : (
        <NotesPanel subjectId={Number(id)} notes={notes} onChange={load} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------
function StudentsPanel({ students, onChange }) {
  const [editing, setEditing] = useState(null);
  const [flash, setFlash] = useState("");

  function initialFor(s) {
    if (!s.features_json) return null;
    try {
      return JSON.parse(s.features_json);
    } catch {
      return null;
    }
  }

  return (
    <div>
      {flash && <div className="mb-4"><Alert kind="info">{flash}</Alert></div>}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[var(--border)] bg-gray-50">
            <tr>
              <th className="th">Student</th>
              <th className="th">Predicted grade</th>
              <th className="th">Updated</th>
              <th className="th text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="td">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.email}</div>
                </td>
                <td className="td">
                  {s.predicted_gradeclass != null ? (
                    <span className={`badge ${GRADE_TINT[s.predicted_gradeclass]}`}>
                      {GRADE_LABELS[s.predicted_gradeclass]} · {GRADE_MEANING[s.predicted_gradeclass]}
                      {s.confidence != null && (
                        <span className="ml-1 opacity-70">({Math.round(s.confidence * 100)}%)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">— not predicted —</span>
                  )}
                </td>
                <td className="td text-gray-400">{s.updated_at?.slice(0, 10) || "—"}</td>
                <td className="td text-right">
                  <button className="btn-ghost !py-1 !px-3 text-xs" onClick={() => setEditing(s)}>
                    {s.predicted_gradeclass != null ? "Update" : "Predict"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Predict grade`} width="max-w-xl">
        {editing && (
          <GradeForm
            student={editing}
            initial={initialFor(editing)}
            onDone={(grade, warning) => {
              setEditing(null);
              if (grade) {
                setFlash(
                  warning ||
                    `Predicted ${GRADE_LABELS[grade.predicted_gradeclass] ?? "?"} for the student.`
                );
                onChange();
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// --------------------------------------------------------------------------
function NotesPanel({ subjectId, notes, onChange }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  async function upload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject_id", String(subjectId));
      fd.append("title", title || file.name);
      const res = await api("/api/teacher/notes", { method: "POST", body: fd });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setMsg({ kind: res.warning ? "info" : "success", text: res.warning || "Uploaded & embedded ✓" });
      onChange();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, t) {
    if (!confirm(`Delete note "${t}"?`)) return;
    await api(`/api/teacher/notes/${id}`, { method: "DELETE" }).catch((e) => alert(e.message));
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={upload} className="card p-5 space-y-3 lg:col-span-1 h-fit">
        <h3 className="font-semibold text-gray-900">Upload note</h3>
        <p className="text-xs text-gray-500">
          PDF, PPT/PPTX or DOC/DOCX. Text is extracted and embedded so students can chat with it.
        </p>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 — Algebra" />
        </div>
        <div>
          <label className="label">File</label>
          <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" className="text-sm" required />
        </div>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Uploading & embedding…" : "Upload"}
        </button>
      </form>

      <div className="lg:col-span-2">
        {notes.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">
            No notes yet. Upload one — it&rsquo;ll appear here and on the students&rsquo; side.
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-3 p-4">
                <span className="text-2xl">
                  {n.mimetype?.includes("pdf") ? "📄" : n.mimetype?.includes("presentation") ? "📊" : "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-400">
                    {n.filename} · {n.chunk_count} chunks ·{" "}
                    {n.embedded ? (
                      <span className="text-emerald-600">embedded ✓</span>
                    ) : (
                      <span className="text-amber-600">not embedded</span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(n.id, n.title)} className="text-sm font-medium text-red-600 hover:text-red-700">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
