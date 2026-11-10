"use client";

import { useEffect } from "react";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, tint = "bg-brand-50 text-brand-700" }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${tint}`}>
        {icon}
      </span>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📭", title, hint }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-semibold text-gray-700">{title}</div>
      {hint && <div className="text-sm text-gray-400">{hint}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`card w-full ${width} p-6`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alert({ kind = "error", children }) {
  if (!children) return null;
  const styles = {
    error: "bg-red-50 text-red-700",
    success: "bg-emerald-50 text-emerald-700",
    info: "bg-sky-50 text-sky-700",
  };
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${styles[kind]}`}>{children}</div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      {label}
    </div>
  );
}
