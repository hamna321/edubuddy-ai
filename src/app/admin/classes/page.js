"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api.js";
import { PageHeader, Modal, Alert, Spinner, EmptyState } from "@/components/ui.js";

export default function ClassesPage() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { classes } = await api("/api/admin/classes");
      setRows(classes);
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/classes", { method: "POST", body: { name } });
      setName("");
      setOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Create a class, add its subjects, assign teachers and enroll students."
        action={
          <button className="btn-primary" onClick={() => { setError(""); setOpen(true); }}>
            + Create class
          </button>
        }
      />

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon="🏫" title="No classes yet" hint="Create your first class to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.id} href={`/admin/classes/${c.id}`} className="card p-5 transition hover:shadow-pop">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-xl">🏫</span>
                <span className="text-xs text-gray-400">{c.created_at?.slice(0, 10)}</span>
              </div>
              <div className="mt-3 font-semibold text-gray-900">{c.name}</div>
              <div className="mt-1 flex gap-3 text-sm text-gray-500">
                <span>📚 {c.subject_count} subjects</span>
                <span>🧑‍🎓 {c.student_count} students</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create class">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Class name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 10 — Section A"
              required
            />
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
