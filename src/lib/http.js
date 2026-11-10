import { NextResponse } from "next/server";

export function ok(data = {}, init) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Wraps an async route handler, turning thrown {status} errors into JSON. */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("API error:", e);
      return fail(e.message || "Server error", status);
    }
  };
}
