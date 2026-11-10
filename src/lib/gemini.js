// Google Gemini embeddings for notes RAG. Uses the REST API directly (no SDK).
// Get a key at https://aistudio.google.com/apikey and set GEMINI_API_KEY.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function key() {
  return process.env.GEMINI_API_KEY || "";
}
export function geminiConfigured() {
  return Boolean(key());
}
function model() {
  return process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
}
const EMBED_DIM = 768; // gemini-embedding-001 supports Matryoshka truncation

/** Embed a batch of strings -> array of number[] vectors (same order). */
export async function embedTexts(texts, taskType = "RETRIEVAL_DOCUMENT") {
  if (!key()) throw Object.assign(new Error("GEMINI_API_KEY is not set."), { status: 503 });
  if (!texts.length) return [];

  const m = `models/${model()}`;
  const requests = texts.map((t) => ({
    model: m,
    content: { parts: [{ text: String(t).slice(0, 8000) }] },
    taskType,
    outputDimensionality: EMBED_DIM,
  }));

  const res = await fetch(`${BASE}/${m}:batchEmbedContents?key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini embed failed (${res.status})`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return (data.embeddings || []).map((e) => e.values);
}

/** Embed a single query string -> number[]. */
export async function embedQuery(text) {
  const [v] = await embedTexts([text], "RETRIEVAL_QUERY");
  return v;
}
