import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import {
  getSubjectFull,
  subjectBelongsToTeacher,
  studentsInClassWithGrades,
  listNotesBySubject,
} from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const s = requireRole("teacher");
  const subjectId = Number(params.id);
  if (!subjectBelongsToTeacher(subjectId, s.id))
    return fail("You don't teach this subject.", 403);

  const subject = getSubjectFull(subjectId);
  return ok({
    subject,
    students: studentsInClassWithGrades(subject.class_id),
    notes: listNotesBySubject(subjectId),
  });
});
