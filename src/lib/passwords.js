// Password hashing — no Next.js imports, so it's usable from plain-Node
// scripts (e.g. scripts/seed.mjs) as well as the app.
import bcrypt from "bcryptjs";

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
