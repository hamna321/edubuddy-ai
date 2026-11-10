import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { chat } from "@/lib/groqchat.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SYSTEM = `You are "Robo", a warm, encouraging companion for a student.
Keep replies short and conversational (1-3 sentences) since they may be read aloud.
Be kind, validating and supportive. You are not a therapist: if the student seems
to be in serious distress, gently encourage them to talk to a trusted adult,
teacher, or counselor. Avoid markdown and emojis.`;

export const POST = handler(async (req) => {
  requireRole();
  const { messages, system } = await req.json().catch(() => ({}));
  if (!Array.isArray(messages) || messages.length === 0)
    return fail("No messages provided.");
  const reply = await chat(messages, system || DEFAULT_SYSTEM, { temperature: 0.8 });
  return ok({ reply });
});
