// Tiny client-side fetch helper. Throws Error(message) on failure.
export async function api(path, { method = "GET", body, headers } = {}) {
  const opts = { method, headers: { ...(headers || {}) } };
  if (body !== undefined && !(body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
