import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { listClasses, createClass } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  requireRole("admin");
  const classes = await listClasses();
  return ok({ classes });
});

export const POST = handler(async (req) => {
  requireRole("admin");
  const { name } = await req.json().catch(() => ({}));

  if (!name || !name.trim()) {
    return fail("Class name is required.");
  }

  const newClass = await createClass(name);
  return ok({ class: newClass });
});