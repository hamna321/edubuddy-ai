import { requireRole } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";
import { deleteUser } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handler(async (_req, { params }) => {
  requireRole("admin");

  await deleteUser(Number(params.id));

  return ok();
});