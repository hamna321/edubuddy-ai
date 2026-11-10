import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { transcribe } from "@/lib/groqchat.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  requireRole(); // any authenticated user
  const { audio, mime } = await req.json().catch(() => ({}));
  if (!audio) return fail("No audio provided.");
  const buf = Buffer.from(audio, "base64");
  const text = await transcribe(buf, mime || "audio/wav");
  return ok({ text });
});
