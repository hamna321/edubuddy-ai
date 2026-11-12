
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

  if (!(await subjectBelongsToTeacher(subjectId, s.id))) {
    return fail("You don't teach this subject.", 403);
  }

  const subject = await getSubjectFull(subjectId);

  if (!subject) {
    return fail("Subject not found.", 404);
  }

  return ok({
    subject,
    students: await studentsInClassWithGrades(subject.class_id),
    notes: await listNotesBySubject(subjectId),
  });
});
