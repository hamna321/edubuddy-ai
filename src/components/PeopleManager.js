"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api.js";
import { PageHeader, Modal, Alert, Spinner, EmptyState } from "@/components/ui.js";

const COPY = {
  teacher: {
    title: "Teachers",
    subtitle: "Enroll teachers by email. Assign them to subjects inside each class.",
    add: "Enroll teacher",
    icon: "🧑‍🏫",
  },
  student: {
    title: "Students",
    subtitle: "Enroll students, then add them to classes.",
    add: "Enroll student",
    icon: "🧑‍🎓",
  },
};

export default function PeopleManager({ role }) {
  const c = COPY[role];
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  async function load() {
    try {
      const { users } = await api(`/api/admin/users?role=${role}`);
      setRows(users);
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/admin/users", {
        method: "POST",
        body: { ...form, role },
      });
      setCreated({ email: res.user.email, tempPassword: res.tempPassword });
      setForm({ name: "", email: "", password: "" });
      setOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, name) {
    if (!confirm(`Remove ${name}? This deletes their account.`)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        action={
          <button className="btn-primary" onClick={() => { setError(""); setOpen(true); }}>
            + {c.add}
          </button>
        }
      />

      {created && (
        <div className="mb-4">
          <Alert kind="success">
            Account created for <b>{created.email}</b>.
            {created.tempPassword && (
              <> Temporary password: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{created.tempPassword}</code> — share it with them.</>
            )}
          </Alert>
        </div>
      )}

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={c.icon} title={`No ${role}s yet`} hint={`Click “${c.add}” to add one.`} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-gray-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Added</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="td font-medium text-gray-900">{u.name}</td>
                  <td className="td">{u.email}</td>
                  <td className="td text-gray-400">{u.created_at?.slice(0, 10)}</td>
                  <td className="td text-right">
                    <button
                      onClick={() => remove(u.id, u.name)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={c.add}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">
              Password <span className="text-gray-400">(optional — auto-generated if blank)</span>
            </label>
            <input
              className="input"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="leave blank to generate"
            />
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : c.add}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
