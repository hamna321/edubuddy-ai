"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api.js";
import { Modal, Alert, Spinner } from "@/components/ui.js";

export default function ClassDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // modal state
  const [subjOpen, setSubjOpen] = useState(false);
  const [subjName, setSubjName] = useState("");
  const [subjTeacher, setSubjTeacher] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await api(`/api/admin/classes/${id}`);
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addSubject(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/classes/${id}/subjects`, {
        method: "POST",
        body: { name: subjName, teacher_id: subjTeacher ? Number(subjTeacher) : null },
      });
      setSubjName("");
      setSubjTeacher("");
      setSubjOpen(false);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function assignTeacher(subjectId, teacherId) {
    try {
      await api(`/api/admin/subjects/${subjectId}`, {
        method: "PATCH",
        body: { teacher_id: teacherId ? Number(teacherId) : null },
      });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function removeSubject(subjectId, name) {
    if (!confirm(`Delete subject "${name}"? Its notes will be removed too.`)) return;
    await api(`/api/admin/subjects/${subjectId}`, { method: "DELETE" }).catch((e) => alert(e.message));
    load();
  }

  async function enroll(e) {
    e.preventDefault();
    if (picked.length === 0) return;
    setBusy(true);
    try {
      await api(`/api/admin/classes/${id}/enroll`, {
        method: "POST",
        body: { student_ids: picked },
      });
      setPicked([]);
      setEnrollOpen(false);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(studentId, name) {
    if (!confirm(`Remove ${name} from this class?`)) return;
    await api(`/api/admin/classes/${id}/enroll`, {
      method: "DELETE",
      body: { student_id: studentId },
    }).catch((e) => alert(e.message));
    load();
  }

  async function removeClass() {
    if (!confirm("Delete this entire class? This cannot be undone.")) return;
    await api(`/api/admin/classes/${id}`, { method: "DELETE" }).catch((e) => alert(e.message));
    router.replace("/admin/classes");
  }

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  const { detail, teachers, availableStudents } = data;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/classes" className="text-sm text-brand-600 hover:underline">
          ← All classes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">🏫 {detail.name}</h1>
          <button onClick={removeClass} className="btn-ghost text-red-600">Delete class</button>
        </div>
      </div>

      {/* Subjects */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">📚 Subjects &amp; teachers</h2>
          <button className="btn-primary !py-1.5" onClick={() => setSubjOpen(true)}>+ Add subject</button>
        </div>
        {detail.subjects.length === 0 ? (
          <div className="card p-6 text-sm text-gray-500">No subjects yet. Add one, then assign a teacher.</div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {detail.subjects.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[140px] flex-1 font-medium text-gray-900">{s.name}</div>
                <select
                  className="input max-w-xs"
                  value={s.teacher_id || ""}
                  onChange={(e) => assignTeacher(s.id, e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
                <button onClick={() => removeSubject(s.id, s.name)} className="text-sm font-medium text-red-600 hover:text-red-700">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Students */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">🧑‍🎓 Enrolled students</h2>
          <button
            className="btn-primary !py-1.5"
            onClick={() => setEnrollOpen(true)}
            disabled={availableStudents.length === 0}
            title={availableStudents.length === 0 ? "All students are already enrolled" : ""}
          >
            + Enroll students
          </button>
        </div>
        {detail.students.length === 0 ? (
          <div className="card p-6 text-sm text-gray-500">No students enrolled yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-[var(--border)] bg-gray-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {detail.students.map((s) => (
                  <tr key={s.id}>
                    <td className="td font-medium text-gray-900">{s.name}</td>
                    <td className="td">{s.email}</td>
                    <td className="td text-right">
                      <button onClick={() => unenroll(s.id, s.name)} className="text-sm font-medium text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add subject modal */}
      <Modal open={subjOpen} onClose={() => setSubjOpen(false)} title="Add subject">
        <form onSubmit={addSubject} className="space-y-4">
          <div>
            <label className="label">Subject name</label>
            <input className="input" value={subjName} onChange={(e) => setSubjName(e.target.value)} placeholder="e.g. Mathematics" required />
          </div>
          <div>
            <label className="label">Assign teacher (optional)</label>
            <select className="input" value={subjTeacher} onChange={(e) => setSubjTeacher(e.target.value)}>
              <option value="">— Unassigned —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setSubjOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add subject"}</button>
          </div>
        </form>
      </Modal>

      {/* Enroll modal */}
      <Modal open={enrollOpen} onClose={() => setEnrollOpen(false)} title="Enroll students">
        <form onSubmit={enroll} className="space-y-4">
          {availableStudents.length === 0 ? (
            <p className="text-sm text-gray-500">All students are already enrolled.</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
              {availableStudents.map((s) => {
                const checked = picked.includes(s.id);
                return (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))
                      }
                    />
                    <span className="text-sm">
                      <span className="font-medium text-gray-900">{s.name}</span>{" "}
                      <span className="text-gray-400">{s.email}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setEnrollOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy || picked.length === 0}>
              {busy ? "Enrolling…" : `Enroll ${picked.length || ""}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
