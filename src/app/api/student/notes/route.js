import { requireRole } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";
import { notesForStudent } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = requireRole("student");
  return ok({ notes: notesForStudent(s.id) });
});
