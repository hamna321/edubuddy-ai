import fs from "node:fs";
import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import { getNote, subjectBelongsToTeacher, deleteNote } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handler(async (_req, { params }) => {
  const s = requireRole("teacher");
  const note = getNote(Number(params.id));
  if (!note) return fail("Note not found", 404);
  if (!subjectBelongsToTeacher(note.subject_id, s.id))
    return fail("You don't own this note.", 403);

  try {
    if (note.stored_path && fs.existsSync(note.stored_path)) fs.unlinkSync(note.stored_path);
  } catch {
    /* ignore file cleanup errors */
  }
  deleteNote(note.id);
  return ok();
});
