
import { requireRole } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";
import {
  subjectsForTeacher,
  classesForTeacher,
  studentsForTeacher,
  unackConcernCountForTeacher,
} from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = requireRole("teacher");

  const [subjects, classes, students, alerts] = await Promise.all([
    subjectsForTeacher(s.id),
    classesForTeacher(s.id),
    studentsForTeacher(s.id),
    unackConcernCountForTeacher(s.id),
  ]);

  return ok({
    subjects,
    classes,
    studentCount: students.length,
    alerts,
  });
});
