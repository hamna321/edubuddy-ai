"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api.js";
import { PageHeader, StatCard, Spinner, EmptyState, Alert } from "@/components/ui.js";

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/teacher/overview").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Teaching" subtitle="Your subjects, students, notes and grade insights." />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon="📚" label="Subjects" value={data.subjects.length} tint="bg-amber-50 text-amber-700" />
        <StatCard icon="🏫" label="Classes" value={data.classes.length} tint="bg-purple-50 text-purple-700" />
        <StatCard icon="🧑‍🎓" label="Students" value={data.studentCount} tint="bg-sky-50 text-sky-700" />
      </div>

      {data.alerts > 0 && (
        <div className="mb-6">
          <Alert kind="info">
            💛 You have <b>{data.alerts}</b> unreviewed wellbeing alert{data.alerts > 1 ? "s" : ""}.{" "}
            <Link href="/teacher/alerts" className="font-semibold underline">Review now</Link>
          </Alert>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Subjects you teach</h2>
      {data.subjects.length === 0 ? (
        <EmptyState icon="📚" title="No subjects assigned yet" hint="An administrator assigns subjects to you." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((s) => (
            <Link key={s.id} href={`/teacher/subject/${s.id}`} className="card p-5 transition hover:shadow-pop">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">📚</span>
              </div>
              <div className="mt-3 font-semibold text-gray-900">{s.name}</div>
              <div className="mt-1 text-sm text-gray-500">{s.class_name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
