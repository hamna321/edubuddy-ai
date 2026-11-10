import { getDb } from "./db.js";
import { hashPassword } from "./passwords.js";

// ===========================================================================
// Users
// ===========================================================================
export function emailExists(email) {
  return !!getDb()
    .prepare("SELECT 1 FROM users WHERE email = ?")
    .get(String(email).toLowerCase().trim());
}

export function createUser({ name, email, password, role }) {
  const db = getDb();
  const clean = String(email).toLowerCase().trim();
  if (emailExists(clean)) {
    const e = new Error("A user with that email already exists.");
    e.status = 409;
    throw e;
  }
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    )
    .run(name.trim(), clean, hashPassword(password), role);
  return getUser(info.lastInsertRowid);
}

export function getUser(id) {
  return getDb()
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(id);
}

export function listByRole(role) {
  return getDb()
    .prepare(
      "SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY name"
    )
    .all(role);
}

export function deleteUser(id) {
  getDb().prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(id);
}

// ===========================================================================
// Classes
// ===========================================================================
export function createClass(name) {
  const db = getDb();
  const info = db.prepare("INSERT INTO classes (name) VALUES (?)").run(name.trim());
  return db.prepare("SELECT * FROM classes WHERE id = ?").get(info.lastInsertRowid);
}

export function listClasses() {
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM subjects s WHERE s.class_id = c.id)   AS subject_count,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count
       FROM classes c ORDER BY c.created_at DESC`
    )
    .all();
}

export function getClass(id) {
  return getDb().prepare("SELECT * FROM classes WHERE id = ?").get(id);
}

export function deleteClass(id) {
  getDb().prepare("DELETE FROM classes WHERE id = ?").run(id);
}

export function getClassDetail(id) {
  const db = getDb();
  const cls = getClass(id);
  if (!cls) return null;
  const subjects = db
    .prepare(
      `SELECT s.*, u.name AS teacher_name, u.email AS teacher_email
       FROM subjects s LEFT JOIN users u ON u.id = s.teacher_id
       WHERE s.class_id = ? ORDER BY s.name`
    )
    .all(id);
  const students = db
    .prepare(
      `SELECT u.id, u.name, u.email
       FROM enrollments e JOIN users u ON u.id = e.student_id
       WHERE e.class_id = ? ORDER BY u.name`
    )
    .all(id);
  return { ...cls, subjects, students };
}

// ===========================================================================
// Subjects
// ===========================================================================
export function addSubject(classId, name, teacherId = null) {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO subjects (class_id, name, teacher_id) VALUES (?, ?, ?)")
    .run(classId, name.trim(), teacherId || null);
  return db.prepare("SELECT * FROM subjects WHERE id = ?").get(info.lastInsertRowid);
}

export function updateSubject(id, { name, teacherId }) {
  const db = getDb();
  const cur = db.prepare("SELECT * FROM subjects WHERE id = ?").get(id);
  if (!cur) return null;
  db.prepare("UPDATE subjects SET name = ?, teacher_id = ? WHERE id = ?").run(
    name !== undefined ? name.trim() : cur.name,
    teacherId !== undefined ? teacherId || null : cur.teacher_id,
    id
  );
  return db.prepare("SELECT * FROM subjects WHERE id = ?").get(id);
}

export function deleteSubject(id) {
  getDb().prepare("DELETE FROM subjects WHERE id = ?").run(id);
}

// ===========================================================================
// Enrollments
// ===========================================================================
export function enrollStudent(classId, studentId) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO enrollments (class_id, student_id) VALUES (?, ?)"
    )
    .run(classId, studentId);
}

export function unenrollStudent(classId, studentId) {
  getDb()
    .prepare("DELETE FROM enrollments WHERE class_id = ? AND student_id = ?")
    .run(classId, studentId);
}

export function studentsNotEnrolled(classId) {
  return getDb()
    .prepare(
      `SELECT id, name, email FROM users
       WHERE role = 'student'
         AND id NOT IN (SELECT student_id FROM enrollments WHERE class_id = ?)
       ORDER BY name`
    )
    .all(classId);
}

// ===========================================================================
// Teacher-facing views
// ===========================================================================
export function classesForTeacher(teacherId) {
  return getDb()
    .prepare(
      `SELECT c.id, c.name,
              GROUP_CONCAT(s.name, ', ') AS subjects,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count
       FROM subjects s JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = ?
       GROUP BY c.id ORDER BY c.name`
    )
    .all(teacherId);
}

export function subjectsForTeacher(teacherId) {
  return getDb()
    .prepare(
      `SELECT s.*, c.name AS class_name FROM subjects s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = ? ORDER BY c.name, s.name`
    )
    .all(teacherId);
}

/** Does this teacher teach any subject in this class? */
export function teacherTeachesClass(teacherId, classId) {
  return !!getDb()
    .prepare("SELECT 1 FROM subjects WHERE teacher_id = ? AND class_id = ? LIMIT 1")
    .get(teacherId, classId);
}

export function teacherTeachesStudent(teacherId, studentId) {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM subjects ss
       JOIN enrollments e ON e.class_id = ss.class_id
       WHERE ss.teacher_id = ? AND e.student_id = ? LIMIT 1`
    )
    .get(teacherId, studentId);
}

/** All students taught by this teacher (across their classes), de-duplicated. */
export function studentsForTeacher(teacherId) {
  return getDb()
    .prepare(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM subjects s
       JOIN enrollments e ON e.class_id = s.class_id
       JOIN users u ON u.id = e.student_id
       WHERE s.teacher_id = ? ORDER BY u.name`
    )
    .all(teacherId);
}

// ===========================================================================
// Student-facing views
// ===========================================================================
export function classesForStudent(studentId) {
  return getDb()
    .prepare(
      `SELECT c.id, c.name FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       WHERE e.student_id = ? ORDER BY c.name`
    )
    .all(studentId);
}

export function subjectsForStudent(studentId) {
  return getDb()
    .prepare(
      `SELECT s.id, s.name, s.class_id, c.name AS class_name,
              u.name AS teacher_name
       FROM enrollments e
       JOIN subjects s ON s.class_id = e.class_id
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.teacher_id
       WHERE e.student_id = ? ORDER BY c.name, s.name`
    )
    .all(studentId);
}

// ===========================================================================
// Subject helpers (teacher scope)
// ===========================================================================
export function getSubjectFull(id) {
  return getDb()
    .prepare(
      `SELECT s.*, c.name AS class_name FROM subjects s
       JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
    )
    .get(id);
}

export function subjectBelongsToTeacher(subjectId, teacherId) {
  return !!getDb()
    .prepare("SELECT 1 FROM subjects WHERE id = ? AND teacher_id = ?")
    .get(subjectId, teacherId);
}

export function studentsInClassWithGrades(classId) {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.email,
              g.predicted_gradeclass, g.predicted_letter, g.predicted_gpa,
              g.confidence, g.features_json, g.updated_at
       FROM enrollments e JOIN users u ON u.id = e.student_id
       LEFT JOIN grades g ON g.student_id = u.id
       WHERE e.class_id = ? ORDER BY u.name`
    )
    .all(classId);
}

// ===========================================================================
// Notes
// ===========================================================================
export function createNote(n) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO notes
        (subject_id, class_id, teacher_id, title, filename, stored_path, mimetype, char_count, chunk_count, embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      n.subjectId, n.classId, n.teacherId, n.title, n.filename, n.storedPath,
      n.mimetype, n.charCount || 0, n.chunkCount || 0, n.embedded ? 1 : 0
    );
  return getNote(info.lastInsertRowid);
}

export function getNote(id) {
  return getDb().prepare("SELECT * FROM notes WHERE id = ?").get(id);
}

export function listNotesBySubject(subjectId) {
  return getDb()
    .prepare("SELECT * FROM notes WHERE subject_id = ? ORDER BY created_at DESC")
    .all(subjectId);
}

export function deleteNote(id) {
  getDb().prepare("DELETE FROM notes WHERE id = ?").run(id);
}

/** Notes visible to a student (via class enrollment). */
export function notesForStudent(studentId) {
  return getDb()
    .prepare(
      `SELECT n.*, s.name AS subject_name, c.name AS class_name, u.name AS teacher_name
       FROM notes n
       JOIN subjects s ON s.id = n.subject_id
       JOIN classes c ON c.id = n.class_id
       JOIN enrollments e ON e.class_id = n.class_id AND e.student_id = ?
       LEFT JOIN users u ON u.id = n.teacher_id
       ORDER BY c.name, s.name, n.created_at DESC`
    )
    .all(studentId);
}

/** Does this student have access to this subject (enrolled in its class)? */
export function studentCanAccessSubject(studentId, subjectId) {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM subjects s
       JOIN enrollments e ON e.class_id = s.class_id
       WHERE s.id = ? AND e.student_id = ?`
    )
    .get(subjectId, studentId);
}

// ===========================================================================
// Grades (XGBoost predictions; one row per student)
// ===========================================================================
export function getGrade(studentId) {
  return getDb().prepare("SELECT * FROM grades WHERE student_id = ?").get(studentId);
}

export function upsertGrade(g) {
  const db = getDb();
  db.prepare(
    `INSERT INTO grades
       (student_id, features_json, predicted_gradeclass, predicted_letter, predicted_gpa, confidence, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(student_id) DO UPDATE SET
       features_json = excluded.features_json,
       predicted_gradeclass = excluded.predicted_gradeclass,
       predicted_letter = excluded.predicted_letter,
       predicted_gpa = excluded.predicted_gpa,
       confidence = excluded.confidence,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).run(
    g.studentId,
    JSON.stringify(g.features),
    g.predicted_gradeclass ?? null,
    g.predicted_letter ?? null,
    g.predicted_gpa ?? null,
    g.confidence ?? null,
    g.updatedBy ?? null
  );
  return getGrade(g.studentId);
}

// ===========================================================================
// Emotion reports
// ===========================================================================
export function createEmotionReport(r) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO emotion_reports
        (student_id, class_id, subject_id, source, emotion, score, severity, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      r.studentId, r.classId ?? null, r.subjectId ?? null, r.source,
      r.emotion, r.score ?? null, r.severity || "info", r.detail ?? null
    );
  return db.prepare("SELECT * FROM emotion_reports WHERE id = ?").get(info.lastInsertRowid);
}

export function emotionReportsForTeacher(teacherId) {
  return getDb()
    .prepare(
      `SELECT er.*, u.name AS student_name, s.name AS subject_name, c.name AS class_name
       FROM emotion_reports er
       JOIN users u ON u.id = er.student_id
       LEFT JOIN subjects s ON s.id = er.subject_id
       LEFT JOIN classes c ON c.id = er.class_id
       WHERE er.subject_id IN (SELECT id FROM subjects WHERE teacher_id = ?)
          OR (er.subject_id IS NULL AND er.student_id IN (
                SELECT DISTINCT e.student_id FROM subjects ss
                JOIN enrollments e ON e.class_id = ss.class_id
                WHERE ss.teacher_id = ?))
       ORDER BY er.created_at DESC`
    )
    .all(teacherId, teacherId);
}

export function acknowledgeReport(id) {
  getDb().prepare("UPDATE emotion_reports SET acknowledged = 1 WHERE id = ?").run(id);
}

export function unackConcernCountForTeacher(teacherId) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM emotion_reports er
       WHERE er.acknowledged = 0 AND er.severity = 'concern'
         AND (er.subject_id IN (SELECT id FROM subjects WHERE teacher_id = ?)
              OR (er.subject_id IS NULL AND er.student_id IN (
                    SELECT DISTINCT e.student_id FROM subjects ss
                    JOIN enrollments e ON e.class_id = ss.class_id
                    WHERE ss.teacher_id = ?)))`
    )
    .get(teacherId, teacherId);
  return row.n;
}
