"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api.js";
import { PageHeader, Spinner, EmptyState, Alert } from "@/components/ui.js";

const EMO = {
  concern: "bg-red-50 border-red-200",
  info: "bg-white border-[var(--border)]",
};

export default function AlertsPage() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { reports } = await api("/api/teacher/alerts");
      setReports(reports);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function ack(id) {
    await api("/api/teacher/alerts", { method: "POST", body: { id } }).catch((e) => alert(e.message));
    load();
  }

  if (error) return <Alert>{error}</Alert>;
  if (!reports) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Wellbeing Alerts"
        subtitle="Emotion signals from students' academic & emotional-support sessions."
      />
      {reports.length === 0 ? (
        <EmptyState icon="💛" title="No alerts" hint="Signals from students will appear here." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 shadow-card ${EMO[r.severity] || EMO.info} ${
                r.acknowledged ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.severity === "concern" ? "⚠️" : "🔔"}</span>
                  <span className="font-semibold text-gray-900">{r.student_name}</span>
                  <span className="badge bg-gray-100 text-gray-600">
                    {r.source === "camera" ? "📷 camera" : r.source === "voice" ? "🎙️ voice" : "💬 text"}
                  </span>
                  <span
                    className={`badge ${
                      r.severity === "concern" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {r.emotion}
                    {r.score != null && ` · ${Math.round(r.score * 100)}%`}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{r.created_at}</span>
              </div>

              {(r.subject_name || r.class_name) && (
                <div className="mt-1 text-xs text-gray-500">
                  {r.subject_name ? `Subject: ${r.subject_name}` : ""}
                  {r.class_name ? ` · ${r.class_name}` : ""}
                </div>
              )}
              {r.detail && (
                <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {r.detail}
                </p>
              )}
              {!r.acknowledged && (
                <div className="mt-3 text-right">
                  <button onClick={() => ack(r.id)} className="btn-ghost !py-1 !px-3 text-xs">
                    Mark reviewed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
