"use client";

import { useState } from "react";
import { api } from "@/lib/api.js";
import { FEATURES, defaultFeatures } from "@/lib/gradeSchema.js";
import { Alert } from "@/components/ui.js";

export default function GradeForm({ student, initial, onDone }) {
  const [form, setForm] = useState(() => ({ ...defaultFeatures(), ...(initial || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/teacher/grades", {
        method: "POST",
        body: { student_id: student.id, features: form },
      });
      onDone(res.grade, res.warning);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Enter <b>{student.name}</b>&rsquo;s profile. The XGBoost model predicts their
        expected grade band.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div key={f.key}>
            <label className="label !mb-0.5 text-xs">{f.label}</label>
            {f.type === "select" ? (
              <select className="input" value={form[f.key]} onChange={(e) => set(f.key, Number(e.target.value))}>
                {f.options.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              />
            )}
          </div>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-ghost" onClick={() => onDone(null)}>Cancel</button>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Predicting…" : "Predict grade"}
        </button>
      </div>
    </form>
  );
}
