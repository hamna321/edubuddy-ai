import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { createEmotionReport, getSubjectFull, studentCanAccessSubject } from "@/lib/repo.js";
import { mlPost } from "@/lib/ml.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEGATIVE = new Set(["sadness", "hate", "anger", "worry", "empty", "boredom", "fear"]);
// Browser CV (face-api) expressions considered concerning.
const CV_NEGATIVE = new Set(["sad", "angry", "fearful", "disgusted"]);

export const POST = handler(async (req) => {
  const s = requireRole("student");
  const body = await req.json().catch(() => ({}));
  const source = body.source;

  // Resolve subject/class context (optional).
  let subjectId = body.subject_id ? Number(body.subject_id) : null;
  let classId = null;
  if (subjectId) {
    if (!studentCanAccessSubject(s.id, subjectId)) subjectId = null;
    else classId = getSubjectFull(subjectId)?.class_id ?? null;
  }

  // --- Camera path: face-api detected the expression client-side -----------
  if (source === "camera") {
    const emotion = String(body.emotion || "neutral").toLowerCase();
    const score = body.score != null ? Number(body.score) : null;
    const severity = CV_NEGATIVE.has(emotion) ? "concern" : "info";
    let report = null;
    if (severity === "concern") {
      report = createEmotionReport({
        studentId: s.id, classId, subjectId, source: "camera",
        emotion, score, severity,
        detail: "Detected via camera during an emotional-support session.",
      });
    }
    return ok({ emotion, severity, reported: !!report });
  }

  // --- Text / voice path: classify with DistilBERT -------------------------
  if (source === "text" || source === "voice") {
    const messages = Array.isArray(body.messages) ? body.messages : (body.text ? [body.text] : []);
    if (messages.length === 0) return fail("No conversation to analyze.");

    const result = await mlPost("/emotion-text", { messages });
    const severity = NEGATIVE.has(result.emotion) ? "concern" : (result.severity || "info");

    let report = null;
    if (severity === "concern") {
      const snippet = (result.evidence ? `"${result.evidence}"\n\n` : "") +
        "From: " + messages.slice(-6).join(" · ");
      report = createEmotionReport({
        studentId: s.id, classId, subjectId, source,
        emotion: result.emotion, score: result.score, severity,
        detail: snippet.slice(0, 600),
      });
    }
    return ok({ emotion: result.emotion, score: result.score, severity, reported: !!report });
  }

  return fail("Unknown emotion source.");
});
