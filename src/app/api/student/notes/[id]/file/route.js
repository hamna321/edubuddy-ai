import fs from "node:fs";
import { requireRole } from "@/lib/auth.js";
import { fail, handler } from "@/lib/http.js";
import { getNote, studentCanAccessSubject } from "@/lib/repo.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const s = requireRole("student");
  const note = getNote(Number(params.id));
  if (!note) return fail("Note not found", 404);
  if (!studentCanAccessSubject(s.id, note.subject_id))
    return fail("You don't have access to this note.", 403);
  if (!note.stored_path || !fs.existsSync(note.stored_path))
    return fail("The file is no longer available.", 404);

  const buf = fs.readFileSync(note.stored_path);
  // PDFs render inline in the browser; other formats download.
  const inline = (note.mimetype || "").includes("pdf");
  const safeName = (note.filename || "note").replace(/["\\]/g, "");
  return new Response(buf, {
    headers: {
      "Content-Type": note.mimetype || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
});
