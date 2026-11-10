import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getDb } from "./db.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export { hashPassword, verifyPassword };

const COOKIE = "edubuddy_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  return process.env.JWT_SECRET || "dev_insecure_secret_change_me";
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    secret(),
    { expiresIn: MAX_AGE }
  );
}

export function setSessionCookie(token) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Returns the decoded session payload {id, role, name, email} or null. */
export function getSession() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return jwt.verify(raw, secret());
  } catch {
    return null;
  }
}

/** Full user record from DB for the current session, or null. */
export function currentUser() {
  const s = getSession();
  if (!s) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(s.id);
  // node:sqlite rows have a null prototype; spread into a plain object so they
  // can be passed as props from Server Components to Client Components.
  return row ? { ...row } : null;
}

/** Throw-style guard for API routes. Returns session or throws {status}. */
export function requireRole(...roles) {
  const s = getSession();
  if (!s) {
    const e = new Error("Not authenticated");
    e.status = 401;
    throw e;
  }
  if (roles.length && !roles.includes(s.role)) {
    const e = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
  return s;
}

export function authenticate(email, password) {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email || "").toLowerCase().trim());
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}
