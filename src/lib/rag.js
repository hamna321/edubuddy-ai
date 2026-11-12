
import { getPool } from "./postgres.js";
import { embedTexts, embedQuery } from "./gemini.js";

// ---------------------------------------------------------------------------
// Chunking: split extracted text into ~1000-character passages.
// ---------------------------------------------------------------------------
export function chunkText(text, { size = 1000, overlap = 150 } = {}) {
  const clean = String(text || "").trim();
  if (!clean) return [];

  const paras = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let buf = "";

  for (const p of paras) {
    if ((buf + "\n\n" + p).length > size && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }

    while (buf.length > size * 1.6) {
      chunks.push(buf.slice(0, size).trim());
      buf = buf.slice(size - overlap);
    }
  }

  if (buf.trim()) chunks.push(buf.trim());

  return chunks;
}

/** Generate embeddings and store note chunks in PostgreSQL. */
export async function embedAndStoreNote(noteId, text) {
  const pool = getPool();
  const chunks = chunkText(text);

  // Generate all embeddings before replacing existing chunks.
  const prepared = [];
  const BATCH = 50;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await embedTexts(slice);

    slice.forEach((content, j) => {
      prepared.push({
        idx: i + j,
        content,
        embedding: vectors[j] ? JSON.stringify(vectors[j]) : null
      });
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM note_chunks WHERE note_id = $1",
      [noteId]
    );

    for (const chunk of prepared) {
      await client.query(
        `INSERT INTO note_chunks (note_id, idx, content, embedding)
         VALUES ($1, $2, $3, $4)`,
        [noteId, chunk.idx, chunk.content, chunk.embedding]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return chunks.length;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/**
 * Retrieve the top-k relevant chunks across a subject's notes.
 * Returns [{ content, note_title, score }].
 */
export async function retrieveForSubject(
  subjectId,
  query,
  k = 5,
  noteIds = null
) {
  const values = [subjectId];

  let sql = `
    SELECT nc.content, nc.embedding, n.title AS note_title
    FROM note_chunks nc
    JOIN notes n ON n.id = nc.note_id
    WHERE n.subject_id = $1
      AND nc.embedding IS NOT NULL
  `;

  if (Array.isArray(noteIds) && noteIds.length) {
    values.push(noteIds.map(Number));
    sql += " AND n.id = ANY($2::bigint[])";
  }

  const result = await getPool().query(sql, values);
  const rows = result.rows;

  if (!rows.length) return [];

  const queryVector = await embedQuery(query);

  const scored = rows.map((row) => ({
    content: row.content,
    note_title: row.note_title,
    score: cosine(queryVector, JSON.parse(row.embedding))
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}
