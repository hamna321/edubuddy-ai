import { currentUser } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = currentUser();
  if (!user) return fail("Not authenticated", 401);
  return ok({ user });
});
