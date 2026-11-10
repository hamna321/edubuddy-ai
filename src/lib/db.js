import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// SQLite via Node's built-in driver (no native compilation needed).
// A single connection is cached on globalThis so Next.js hot-reload in dev
// doesn't open a new handle on every request.
// ---------------------------------------------------------------------------

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const DB_PATH = path.join(DATA_DIR, "edubuddy.db");

function createConnection() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  seedAdmin(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK (role IN ('admin','teacher','student')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (class_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title       TEXT    NOT NULL,
      filename    TEXT    NOT NULL,
      stored_path TEXT    NOT NULL,
      mimetype    TEXT,
      char_count  INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      embedded    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_chunks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      idx        INTEGER NOT NULL,
      content    TEXT    NOT NULL,
      embedding  TEXT
    );

    CREATE TABLE IF NOT EXISTS grades (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      features_json        TEXT    NOT NULL,
      predicted_gradeclass INTEGER,
      predicted_letter     TEXT,
      predicted_gpa        REAL,
      confidence           REAL,
      updated_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emotion_reports (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id     INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      source       TEXT    NOT NULL CHECK (source IN ('camera','text','voice')),
      emotion      TEXT    NOT NULL,
      score        REAL,
      severity     TEXT    NOT NULL DEFAULT 'info' CHECK (severity IN ('info','concern')),
      detail       TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_subjects_class   ON subjects(class_id);
    CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_enroll_class     ON enrollments(class_id);
    CREATE INDEX IF NOT EXISTS idx_enroll_student   ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_notes_subject    ON notes(subject_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_note      ON note_chunks(note_id);
    CREATE INDEX IF NOT EXISTS idx_emotion_student  ON emotion_reports(student_id);
  `);
}

function seedAdmin(db) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get();
  if (row.n > 0) return;
  const email = (process.env.ADMIN_EMAIL || "admin@edubuddy.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
  ).run("Administrator", email, hash);
  // eslint-disable-next-line no-console
  console.log(`\n  [EduBuddy] Seeded admin account -> ${email} / ${password}\n`);
}

export function getDb() {
  if (!globalThis.__edubuddyDb) {
    globalThis.__edubuddyDb = createConnection();
  }
  return globalThis.__edubuddyDb;
}
