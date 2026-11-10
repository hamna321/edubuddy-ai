import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { listByRole, createUser } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  requireRole("admin");
  const role = new URL(req.url).searchParams.get("role");
  if (!["teacher", "student"].includes(role))
    return fail("role must be teacher or student");
  return ok({ users: listByRole(role) });
});

export const POST = handler(async (req) => {
  requireRole("admin");
  const { name, email, password, role } = await req.json().catch(() => ({}));
  if (!name || !email) return fail("Name and email are required.");
  if (!["teacher", "student"].includes(role))
    return fail("role must be teacher or student");

  // If no password supplied, generate a shareable temporary one.
  const generated = !password;
  const finalPassword = password || genPassword();
  const user = createUser({ name, email, password: finalPassword, role });
  return ok({ user, tempPassword: generated ? finalPassword : undefined });
});

function genPassword() {
  const words = ["sky", "leaf", "moon", "wave", "star", "pine", "rain", "fox"];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.floor(1000 + Math.random() * 9000)}`;
}
