
import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { teacherTeachesStudent, upsertGrade } from "@/lib/repo.js";
import { coerceFeatures, GRADE_LABELS } from "@/lib/gradeSchema.js";
import { mlPost } from "@/lib/ml.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const s = requireRole("teacher");
  const { student_id, features } = await req.json().catch(() => ({}));
  const studentId = Number(student_id);
  if (!studentId) return fail("student_id is required.");

  if (!(await teacherTeachesStudent(s.id, studentId))) {
    return fail("This student isn't in one of your classes.", 403);
  }

  const feat = coerceFeatures(features);

  try {
    const pred = await mlPost("/predict-grade", { features: feat });
    const gc = Number(pred.gradeclass);

    const grade = await upsertGrade({
      studentId,
      features: feat,
      predicted_gradeclass: gc,
      predicted_letter: GRADE_LABELS[gc] ?? null,
      predicted_gpa: pred.gpa_estimate ?? null,
      confidence: pred.confidence ?? null,
      updatedBy: s.id,
    });

    return ok({ grade });
  } catch (e) {
    if (e.status === 503) {
      const grade = await upsertGrade({
        studentId,
        features: feat,
        updatedBy: s.id,
      });

      return ok({ grade, warning: e.message });
    }
    throw e;
  }
});
