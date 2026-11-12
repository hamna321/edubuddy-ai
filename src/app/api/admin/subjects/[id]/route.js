import { requireRole } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";
import { updateSubject, deleteSubject } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = handler(async (req, { params }) => {
  requireRole("admin");

  const body = await req.json().catch(() => ({}));
  const patch = {};

  if (body.name !== undefined) patch.name = body.name;
  if (body.teacher_id !== undefined) patch.teacherId = body.teacher_id;

  const subject = await updateSubject(Number(params.id), patch);

  return ok({ subject });
});

export const DELETE = handler(async (_req, { params }) => {
  requireRole("admin");

  await deleteSubject(Number(params.id));

  return ok();
});