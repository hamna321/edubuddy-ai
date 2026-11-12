
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getPool } from "./postgres.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export { hashPassword, verifyPassword };

const COOKIE = "edubuddy_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  return process.env.JWT_SECRET || "dev_insecure_secret_change_me";
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    },
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
    maxAge: MAX_AGE
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });
}

/** Returns the decoded session payload or null. */
export function getSession() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;

  try {
    return jwt.verify(raw, secret());
  } catch {
    return null;
  }
}

/** Full user record from PostgreSQL for the current session. */
export async function currentUser() {
  const session = getSession();
  if (!session) return null;

  const result = await getPool().query(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = $1`,
    [session.id]
  );

  return result.rows[0] || null;
}

/** Synchronous session-role guard for API routes. */
export function requireRole(...roles) {
  const session = getSession();

  if (!session) {
    const error = new Error("Not authenticated");
    error.status = 401;
    throw error;
  }

  if (roles.length && !roles.includes(session.role)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  return session;
}

/** Authenticate a user against PostgreSQL. */
export async function authenticate(email, password) {
  const result = await getPool().query(
    "SELECT * FROM users WHERE email = $1",
    [String(email || "").toLowerCase().trim()]
  );

  const user = result.rows[0];

  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  return user;
}
