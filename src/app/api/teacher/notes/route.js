import fs from "node:fs";
import path from "node:path";
import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { subjectBelongsToTeacher, getSubjectFull, createNote, getNote } from "@/lib/repo.js";
import { getDb } from "@/lib/db.js";
import { extractText, SUPPORTED } from "@/lib/extract.js";
import { embedAndStoreNote } from "@/lib/rag.js";
import { geminiConfigured } from "@/lib/gemini.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

export const POST = handler(async (req) => {
  const s = requireRole("teacher");
  const form = await req.formData();
  const file = form.get("file");
  const subjectId = Number(form.get("subject_id"));
  const title = String(form.get("title") || "").trim();

  if (!file || typeof file === "string") return fail("A file is required.");
  if (!subjectId) return fail("subject_id is required.");
  if (!subjectBelongsToTeacher(subjectId, s.id))
    return fail("You don't teach this subject.", 403);

  const mimetype = file.type || "application/octet-stream";
  if (!SUPPORTED[mimetype] && !/\.(pdf|pptx?|docx?)$/i.test(file.name || ""))
    return fail("Unsupported file. Upload a PDF, PPT/PPTX or DOC/DOCX.");

  // Persist the raw file.
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const safe = (file.name || "note").replace(/[^\w.\-]+/g, "_");
  const stored = `${Date.now()}_${safe}`;
  const storedPath = path.join(UPLOAD_DIR, stored);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(storedPath, buf);

  // Extract text.
  let text = "";
  try {
    text = await extractText(storedPath);
  } catch (e) {
    return fail("Could not read that file: " + e.message, 422);
  }

  const cls = getSubjectFull(subjectId);
  const note = createNote({
    subjectId,
    classId: cls.class_id,
    teacherId: s.id,
    title: title || file.name,
    filename: file.name,
    storedPath,
    mimetype,
    charCount: text.length,
    chunkCount: 0,
    embedded: 0,
  });

  // Embed (Gemini) + store chunks. Non-fatal if it fails or no key is set.
  let warning = null;
  if (!geminiConfigured()) {
    warning = "Saved, but embeddings are off (set GEMINI_API_KEY to enable note chat).";
  } else {
    try {
      const chunks = await embedAndStoreNote(note.id, text);
      getDb()
        .prepare("UPDATE notes SET chunk_count = ?, embedded = 1 WHERE id = ?")
        .run(chunks, note.id);
    } catch (e) {
      warning = "Saved, but embedding failed: " + e.message;
    }
  }

  return ok({ note: getNote(note.id), warning });
});
