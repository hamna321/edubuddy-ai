import Link from "next/link";
import { listByRole, listClasses } from "@/lib/repo.js";
import { StatCard } from "@/components/ui.js";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const teachers = listByRole("teacher");
  const students = listByRole("student");
  const classes = listClasses();
  const subjectCount = classes.reduce((n, c) => n + (c.subject_count || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage teachers, students, classes and subject assignments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="🧑‍🏫" label="Teachers" value={teachers.length} tint="bg-emerald-50 text-emerald-700" />
        <StatCard icon="🧑‍🎓" label="Students" value={students.length} tint="bg-sky-50 text-sky-700" />
        <StatCard icon="🏫" label="Classes" value={classes.length} tint="bg-purple-50 text-purple-700" />
        <StatCard icon="📚" label="Subjects" value={subjectCount} tint="bg-amber-50 text-amber-700" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <QuickLink href="/admin/teachers" icon="🧑‍🏫" title="Enroll a teacher" desc="Create teacher accounts by email." />
        <QuickLink href="/admin/students" icon="🧑‍🎓" title="Enroll a student" desc="Add students to the portal." />
        <QuickLink href="/admin/classes" icon="🏫" title="Build a class" desc="Add subjects, assign teachers, enroll students." />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, title, desc }) {
  return (
    <Link href={href} className="card p-5 transition hover:shadow-pop">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-500">{desc}</div>
    </Link>
  );
}
