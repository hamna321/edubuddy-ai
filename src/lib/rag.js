import { getDb } from "./db.js";
import { embedTexts, embedQuery } from "./gemini.js";

// ---------------------------------------------------------------------------
// Chunking: split extracted text into ~1000-char passages on paragraph/line
// boundaries, with a little overlap so context isn't cut mid-idea.
// ---------------------------------------------------------------------------
export function chunkText(text, { size = 1000, overlap = 150 } = {}) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > size && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
    // A single very long paragraph: hard-split it.
    while (buf.length > size * 1.6) {
      chunks.push(buf.slice(0, size).trim());
      buf = buf.slice(size - overlap);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

/** Chunk + embed (Gemini) + persist chunks for a note. Returns chunk count. */
export async function embedAndStoreNote(noteId, text) {
  const db = getDb();
  const chunks = chunkText(text);
  db.prepare("DELETE FROM note_chunks WHERE note_id = ?").run(noteId);
  if (!chunks.length) return 0;

  // Embed in sub-batches to stay within request limits.
  const insert = db.prepare(
    "INSERT INTO note_chunks (note_id, idx, content, embedding) VALUES (?, ?, ?, ?)"
  );
  const BATCH = 50;
  let idx = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await embedTexts(slice);
    slice.forEach((content, j) => {
      const vec = vectors[j] ? JSON.stringify(vectors[j]) : null;
      insert.run(noteId, idx++, content, vec);
    });
  }
  return chunks.length;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/**
 * Retrieve the top-k most relevant chunks across a subject's notes for a query.
 * Returns [{ content, note_title, score }].
 */
export async function retrieveForSubject(subjectId, query, k = 5, noteIds = null) {
  const db = getDb();
  let sql = `SELECT nc.content, nc.embedding, n.title AS note_title
       FROM note_chunks nc JOIN notes n ON n.id = nc.note_id
       WHERE n.subject_id = ? AND nc.embedding IS NOT NULL`;
  const args = [subjectId];
  if (Array.isArray(noteIds) && noteIds.length) {
    sql += ` AND n.id IN (${noteIds.map(() => "?").join(",")})`;
    args.push(...noteIds.map(Number));
  }
  const rows = db.prepare(sql).all(...args);
  if (!rows.length) return [];

  const qv = await embedQuery(query);
  const scored = rows.map((r) => ({
    content: r.content,
    note_title: r.note_title,
    score: cosine(qv, JSON.parse(r.embedding)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
