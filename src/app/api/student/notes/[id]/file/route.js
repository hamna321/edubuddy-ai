
import { requireRole } from "@/lib/auth.js";
import { ok, fail, handler } from "@/lib/http.js";
import {
  getNote,
  subjectBelongsToTeacher,
  deleteNote,
} from "@/lib/repo.js";
import { getStorageBucket } from "@/lib/storage.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handler(async (_req, { params }) => {
  const s = requireRole("teacher");

  const note = await getNote(Number(params.id));

  if (!note) {
    return fail("Note not found", 404);
  }

  if (!(await subjectBelongsToTeacher(note.subject_id, s.id))) {
    return fail("You don't own this note.", 403);
  }

  if (note.stored_path) {
    const { error } = await getStorageBucket().remove([
      note.stored_path,
    ]);

    if (error) {
      return fail("Could not delete the stored file: " + error.message, 500);
    }
  }

  await deleteNote(note.id);

  return ok();
});
