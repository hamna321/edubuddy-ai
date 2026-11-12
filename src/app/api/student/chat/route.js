import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { studentCanAccessSubject, getSubjectFull, getGrade } from "@/lib/repo.js";
import { retrieveForSubject } from "@/lib/rag.js";
import { chat } from "@/lib/groqchat.js";
import { GRADE_LABELS } from "@/lib/gradeSchema.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adapt the tutor's style to the student's predicted performance band.
function levelGuidance(gradeclass) {
  if (gradeclass == null)
    return "Explain clearly with simple examples and check their understanding.";
  if (gradeclass <= 1)
    return "This student is doing well — you can go a bit deeper, add a challenge question, and keep a brisk pace while staying friendly.";
  if (gradeclass === 2)
    return "This student is about average — explain step by step with concrete examples and confirm they follow along.";
  return "This student is currently struggling — be extra encouraging and patient, break ideas into very small steps, use plain language and lots of everyday examples, and celebrate small wins.";
}

export const POST = handler(async (req) => {
  const s = requireRole("student");
  const { subject_id, messages, note_ids } = await req.json().catch(() => ({}));
  const subjectId = Number(subject_id);
  if (!subjectId) return fail("Pick a subject first.");
  if (!Array.isArray(messages) || messages.length === 0) return fail("No messages provided.");
  if (!(await studentCanAccessSubject(s.id, subjectId)))
    return fail("You're not enrolled in this subject.", 403);

  const noteIds = Array.isArray(note_ids) && note_ids.length ? note_ids.map(Number) : null;

  const subject = await getSubjectFull(subjectId);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.text || "";

  // Retrieve relevant note passages (best-effort — needs Gemini embeddings).
  let sources = [];
  let context = "";
  let noteWarning = null;
  try {
    const hits = await retrieveForSubject(subjectId, query, 5, noteIds);
    sources = hits.map((h) => ({ title: h.note_title, score: Math.round(h.score * 100) / 100 }));
    context = hits.map((h, i) => `[[${i + 1}]] (${h.note_title})\n${h.content}`).join("\n\n");
  } catch (e) {
    noteWarning = e.message;
  }

  const grade = await getGrade(s.id);
  const gc = grade?.predicted_gradeclass ?? null;

  const system = `You are "Robo", a friendly, patient study tutor helping ${s.name} with ${subject.name} (${subject.class_name}).

TEACHING STYLE: ${levelGuidance(gc)}

Use the CLASS NOTES below as your primary source. Prefer them over outside knowledge. If the notes don't cover the question, say so briefly, then give a short helpful general answer. Cite which note you used in plain language when relevant. Keep answers focused and encouraging. Avoid heavy markdown; short lists are fine.

CLASS NOTES:
${context || "(No note passages were found for this question.)"}`;

  const reply = await chat(messages, system, { temperature: 0.5, maxTokens: 800 });
  return ok({ reply, sources, noteWarning });
});
