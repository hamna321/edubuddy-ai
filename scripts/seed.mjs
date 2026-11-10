/**
 * Seed demo data for EduBuddy.  Run:  npm run seed
 * Idempotent — safe to run more than once (skips anything that exists).
 */
import {
  emailExists, createUser, listClasses, createClass,
  addSubject, enrollStudent, listByRole,
} from "../src/lib/repo.js";

function ensureUser(name, email, password, role) {
  if (emailExists(email)) {
    console.log(`  = ${role} exists: ${email}`);
    return listByRole(role).find((u) => u.email === email);
  }
  const u = createUser({ name, email, password, role });
  console.log(`  + ${role}: ${email} / ${password}`);
  return u;
}

console.log("\nSeeding EduBuddy demo data…\n");

const sara = ensureUser("Sara Khan", "sara@edubuddy.local", "teach123", "teacher");
const omar = ensureUser("Omar Farooq", "omar@edubuddy.local", "teach123", "teacher");

const students = [
  ["Ali Raza", "ali@edubuddy.local"],
  ["Zoya Malik", "zoya@edubuddy.local"],
  ["Bilal Ahmed", "bilal@edubuddy.local"],
  ["Hina Sheikh", "hina@edubuddy.local"],
].map(([n, e]) => ensureUser(n, e, "learn123", "student"));

let cls = listClasses().find((c) => c.name === "Grade 10 — Section A");
if (!cls) {
  cls = createClass("Grade 10 — Section A");
  console.log(`  + class: ${cls.name}`);
  addSubject(cls.id, "Mathematics", omar.id);
  addSubject(cls.id, "English", sara.id);
  addSubject(cls.id, "Science", sara.id);
  for (const s of students) enrollStudent(cls.id, s.id);
  console.log(`  + 3 subjects + ${students.length} students enrolled`);
} else {
  console.log(`  = class exists: ${cls.name}`);
}

console.log("\n✓ Done.\n");
console.log("  Admin:    admin@edubuddy.local / admin123");
console.log("  Teacher:  sara@edubuddy.local  / teach123");
console.log("  Student:  ali@edubuddy.local   / learn123\n");
process.exit(0);
