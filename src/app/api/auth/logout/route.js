import { clearSessionCookie } from "@/lib/auth.js";
import { ok, handler } from "@/lib/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  clearSessionCookie();
  return ok();
});
