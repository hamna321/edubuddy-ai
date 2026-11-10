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
  return ok({
    subjects: subjectsForTeacher(s.id),
    classes: classesForTeacher(s.id),
    studentCount: studentsForTeacher(s.id).length,
    alerts: unackConcernCountForTeacher(s.id),
  });
});
