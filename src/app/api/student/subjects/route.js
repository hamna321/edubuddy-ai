import { requireRole } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";
import { subjectsForStudent } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = requireRole("student");
  return ok({ subjects: await subjectsForStudent(s.id) });
});
