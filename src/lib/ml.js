// Client for the local Python ML service (DistilBERT emotion + XGBoost grades).

function baseUrl() {
  return process.env.ML_SERVICE_URL || "http://localhost:5000";
}
function serviceKey() {
  return process.env.ML_SERVICE_KEY || "";
}

export async function mlPost(path, body, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl() + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": serviceKey(),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data?.error || `ML service error (${res.status})`), {
        status: res.status,
      });
    }
    return data;
  } catch (e) {
    if (e.name === "AbortError")
      throw Object.assign(new Error("ML service timed out. Is it running on :5000?"), { status: 503 });
    if (e.cause?.code === "ECONNREFUSED" || /fetch failed/i.test(e.message))
      throw Object.assign(
        new Error("ML service is offline. Start it: cd ml-service && python app.py"),
        { status: 503 }
      );
    throw e;
  }
}

export async function mlHealthy() {
  try {
    const res = await fetch(baseUrl() + "/health", { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
