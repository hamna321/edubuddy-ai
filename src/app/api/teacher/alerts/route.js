
import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { emotionReportsForTeacher, acknowledgeReport } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = requireRole("teacher");
  return ok({ reports: await emotionReportsForTeacher(s.id) });
});

export const POST = handler(async (req) => {
  requireRole("teacher");
  const { id } = await req.json().catch(() => ({}));
  if (!id) return fail("id is required.");
  await acknowledgeReport(Number(id));
  return ok();
});
