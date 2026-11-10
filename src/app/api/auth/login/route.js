import { authenticate, signToken, setSessionCookie } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return fail("Email and password are required.");

  const user = authenticate(email, password);
  if (!user) return fail("Invalid email or password.", 401);

  setSessionCookie(signToken(user));
  return ok({ role: user.role, name: user.name });
});
