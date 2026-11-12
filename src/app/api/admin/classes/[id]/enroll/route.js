import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { enrollStudent, unenrollStudent } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req, { params }) => {
  requireRole("admin");

  const classId = Number(params.id);
  const { student_ids } = await req.json().catch(() => ({}));

  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return fail("Select at least one student.");
  }

  for (const sid of student_ids) {
    await enrollStudent(classId, Number(sid));
  }

  return ok({ enrolled: student_ids.length });
});

export const DELETE = handler(async (req, { params }) => {
  requireRole("admin");

  const classId = Number(params.id);
  const { student_id } = await req.json().catch(() => ({}));

  if (!student_id) return fail("student_id is required.");

  await unenrollStudent(classId, Number(student_id));

  return ok();
});
