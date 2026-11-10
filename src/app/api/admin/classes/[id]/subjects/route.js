import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { addSubject } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req, { params }) => {
  requireRole("admin");
  const { name, teacher_id } = await req.json().catch(() => ({}));
  if (!name || !name.trim()) return fail("Subject name is required.");
  return ok({ subject: addSubject(Number(params.id), name, teacher_id) });
});
