// Groq helpers (chat + Whisper transcription). Ported from the "2d robot"
// project so the API key stays server-side. Node 18+ global fetch/FormData/Blob.

const BASE = "https://api.groq.com/openai/v1";

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}
function chatModel() {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}
function sttModel() {
  return process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
}

/**
 * messages: [{ role: 'user'|'assistant', text }]. A system prompt is prepended.
 * Returns the assistant's reply text.
 */
export async function chat(messages, systemPrompt, { temperature = 0.7, maxTokens = 700 } = {}) {
  if (!groqConfigured())
    throw Object.assign(new Error("GROQ_API_KEY is not configured."), { status: 503 });

  const payload = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.text ?? m.content ?? ""),
    })),
  ];

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: chatModel(),
      messages: payload,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Groq error (${res.status})`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return (data?.choices?.[0]?.message?.content || "").trim();
}

/** audioBuffer: Buffer of the (wav/webm) clip. Returns transcript text. */
export async function transcribe(audioBuffer, mime = "audio/wav") {
  if (!groqConfigured())
    throw Object.assign(new Error("GROQ_API_KEY is not configured."), { status: 503 });

  const form = new FormData();
  const ext = mime.includes("webm") ? "webm" : "wav";
  form.append("file", new Blob([audioBuffer], { type: mime }), `audio.${ext}`);
  form.append("model", sttModel());
  form.append("response_format", "json");
  form.append("temperature", "0");

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.GROQ_API_KEY },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Groq transcribe error (${res.status})`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return (data?.text || "").trim();
}
