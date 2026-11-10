import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import {
  getClassDetail,
  deleteClass,
  listByRole,
  studentsNotEnrolled,
} from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  requireRole("admin");
  const id = Number(params.id);
  const detail = getClassDetail(id);
  if (!detail) return fail("Class not found", 404);
  return ok({
    detail,
    teachers: listByRole("teacher"),
    availableStudents: studentsNotEnrolled(id),
  });
});

export const DELETE = handler(async (_req, { params }) => {
  requireRole("admin");
  deleteClass(Number(params.id));
  return ok();
});
