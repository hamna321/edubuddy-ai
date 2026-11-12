import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import {
  subjectBelongsToTeacher,
  getSubjectFull,
  createNote,
  getNote,
} from "@/lib/repo.js";
import { extractText, SUPPORTED } from "@/lib/extract.js";
import { embedAndStoreNote } from "@/lib/rag.js";
import { geminiConfigured } from "@/lib/gemini.js";
import { getStorageBucket } from "@/lib/storage.js";
import { getPool } from "@/lib/postgres.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const teacher = requireRole("teacher");
  const form = await req.formData();

  const file = form.get("file");
  const subjectId = Number(form.get("subject_id"));
  const title = String(form.get("title") || "").trim();

  if (!file || typeof file === "string") {
    return fail("A file is required.");
  }

  if (!subjectId || !Number.isInteger(subjectId)) {
    return fail("A valid subject_id is required.");
  }

  if (!(await subjectBelongsToTeacher(subjectId, teacher.id))) {
    return fail("You don't teach this subject.", 403);
  }

  const mimetype = file.type || "application/octet-stream";
  const filename = file.name || "note";

  if (
    !SUPPORTED[mimetype] &&
    !/\.(pdf|pptx?|docx?)$/i.test(filename)
  ) {
    return fail("Unsupported file. Upload a PDF, PPT/PPTX or DOC/DOCX.");
  }

  if (file.size === 0) {
    return fail("The uploaded file is empty.");
  }

  const subject = await getSubjectFull(subjectId);

  if (!subject) {
    return fail("Subject not found.", 404);
  }

  const safe = filename.replace(/[^\w.\-]+/g, "_");
  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract text using a temporary local copy.
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "edubuddy-note-")
  );
  const tempPath = path.join(tempDir, safe);

  let extractedText = "";

  try {
    await fs.writeFile(tempPath, buffer);
    extractedText = await extractText(tempPath);
  } catch (error) {
    return fail(
      "Could not read that file: " + error.message,
      422
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
      .catch(() => {});
  }

  const objectKey =
    `notes/${subjectId}/${Date.now()}_${safe}`;

  const bucket = getStorageBucket();

  const { error: uploadError } = await bucket.upload(
    objectKey,
    buffer,
    {
      contentType: mimetype,
      upsert: false,
    }
  );

  if (uploadError) {
    throw new Error("Supabase upload failed: " + uploadError.message);
  }

  let note;

  try {
    note = await createNote({
      subjectId,
      classId: subject.class_id,
      teacherId: teacher.id,
      title: title || filename,
      filename,
      storedPath: objectKey,
      mimetype,
      charCount: extractedText.length,
      chunkCount: 0,
      embedded: 0,
    });
  } catch (error) {
    await bucket.remove([objectKey]).catch(() => {});
    throw error;
  }

  let warning = null;

  if (!geminiConfigured()) {
    warning =
      "File saved, but embeddings are disabled. Configure GEMINI_API_KEY to enable note chat.";
  } else {
    try {
      const chunks = await embedAndStoreNote(
        note.id,
        extractedText
      );

      await getPool().query(
        `UPDATE notes
         SET chunk_count = $1, embedded = 1
         WHERE id = $2`,
        [chunks, note.id]
      );
    } catch (error) {
      warning =
        "File saved, but embedding failed: " + error.message;
    }
  }

  return ok({
    note: await getNote(note.id),
    warning,
  });
});
