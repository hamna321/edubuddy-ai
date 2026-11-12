
import { getPool } from "./postgres.js";
import { hashPassword } from "./passwords.js";

// ===========================================================================
// Users
// ===========================================================================

export async function emailExists(email) {
  const result = await getPool().query(
    "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
    [String(email).toLowerCase().trim()]
  );
  return result.rows.length > 0;
}

export async function createUser({ name, email, password, role }) {
  const clean = String(email).toLowerCase().trim();

  try {
    const result = await getPool().query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), clean, hashPassword(password), role]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const e = new Error("A user with that email already exists.");
      e.status = 409;
      throw e;
    }
    throw error;
  }
}

export async function getUser(id) {
  const result = await getPool().query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function listByRole(role) {
  const result = await getPool().query(
    `SELECT id, name, email, role, created_at
     FROM users WHERE role = $1 ORDER BY name`,
    [role]
  );
  return result.rows;
}

export async function deleteUser(id) {
  await getPool().query(
    "DELETE FROM users WHERE id = $1 AND role != 'admin'",
    [id]
  );
}

// ===========================================================================
// Classes
// ===========================================================================

export async function createClass(name) {
  const result = await getPool().query(
    "INSERT INTO classes (name) VALUES ($1) RETURNING *",
    [name.trim()]
  );
  return result.rows[0];
}

export async function listClasses() {
  const result = await getPool().query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM subjects s WHERE s.class_id = c.id)::int AS subject_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id)::int AS student_count
     FROM classes c
     ORDER BY c.created_at DESC`
  );
  return result.rows;
}

export async function getClass(id) {
  const result = await getPool().query(
    "SELECT * FROM classes WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteClass(id) {
  await getPool().query(
    "DELETE FROM classes WHERE id = $1",
    [id]
  );
}

export async function getClassDetail(id) {
  const pool = getPool();

  const [classResult, subjectResult, studentResult] = await Promise.all([
    pool.query("SELECT * FROM classes WHERE id = $1", [id]),

    pool.query(
      `SELECT s.*, u.name AS teacher_name, u.email AS teacher_email
       FROM subjects s
       LEFT JOIN users u ON u.id = s.teacher_id
       WHERE s.class_id = $1
       ORDER BY s.name`,
      [id]
    ),

    pool.query(
      `SELECT u.id, u.name, u.email
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.class_id = $1
       ORDER BY u.name`,
      [id]
    )
  ]);

  const cls = classResult.rows[0];
  if (!cls) return null;

  return {
    ...cls,
    subjects: subjectResult.rows,
    students: studentResult.rows
  };
}

// ===========================================================================
// Subjects
// ===========================================================================

export async function addSubject(classId, name, teacherId = null) {
  const result = await getPool().query(
    `INSERT INTO subjects (class_id, name, teacher_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [classId, name.trim(), teacherId || null]
  );
  return result.rows[0];
}

export async function updateSubject(id, { name, teacherId }) {
  const pool = getPool();

  const current = await pool.query(
    "SELECT * FROM subjects WHERE id = $1",
    [id]
  );

  const cur = current.rows[0];
  if (!cur) return null;

  const result = await pool.query(
    `UPDATE subjects
     SET name = $1, teacher_id = $2
     WHERE id = $3
     RETURNING *`,
    [
      name !== undefined ? name.trim() : cur.name,
      teacherId !== undefined ? (teacherId || null) : cur.teacher_id,
      id
    ]
  );

  return result.rows[0] || null;
}

export async function deleteSubject(id) {
  await getPool().query(
    "DELETE FROM subjects WHERE id = $1",
    [id]
  );
}

// ===========================================================================
// Enrollments
// ===========================================================================

export async function enrollStudent(classId, studentId) {
  await getPool().query(
    `INSERT INTO enrollments (class_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [classId, studentId]
  );
}

export async function unenrollStudent(classId, studentId) {
  await getPool().query(
    "DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2",
    [classId, studentId]
  );
}

export async function studentsNotEnrolled(classId) {
  const result = await getPool().query(
    `SELECT id, name, email
     FROM users
     WHERE role = 'student'
       AND id NOT IN (
         SELECT student_id FROM enrollments WHERE class_id = $1
       )
     ORDER BY name`,
    [classId]
  );
  return result.rows;
}

// ===========================================================================
// Teacher-facing views
// ===========================================================================

export async function classesForTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT c.id, c.name,
            STRING_AGG(s.name, ', ') AS subjects,
            (SELECT COUNT(*)::int FROM enrollments e
             WHERE e.class_id = c.id) AS student_count
     FROM subjects s
     JOIN classes c ON c.id = s.class_id
     WHERE s.teacher_id = $1
     GROUP BY c.id, c.name
     ORDER BY c.name`,
    [teacherId]
  );
  return result.rows;
}

export async function subjectsForTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT s.*, c.name AS class_name
     FROM subjects s
     JOIN classes c ON c.id = s.class_id
     WHERE s.teacher_id = $1
     ORDER BY c.name, s.name`,
    [teacherId]
  );
  return result.rows;
}

export async function teacherTeachesClass(teacherId, classId) {
  const result = await getPool().query(
    `SELECT 1 FROM subjects
     WHERE teacher_id = $1 AND class_id = $2
     LIMIT 1`,
    [teacherId, classId]
  );
  return result.rows.length > 0;
}

export async function teacherTeachesStudent(teacherId, studentId) {
  const result = await getPool().query(
    `SELECT 1
     FROM subjects ss
     JOIN enrollments e ON e.class_id = ss.class_id
     WHERE ss.teacher_id = $1 AND e.student_id = $2
     LIMIT 1`,
    [teacherId, studentId]
  );
  return result.rows.length > 0;
}

export async function studentsForTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM subjects s
     JOIN enrollments e ON e.class_id = s.class_id
     JOIN users u ON u.id = e.student_id
     WHERE s.teacher_id = $1
     ORDER BY u.name`,
    [teacherId]
  );
  return result.rows;
}

// ===========================================================================
// Student-facing views
// ===========================================================================

export async function classesForStudent(studentId) {
  const result = await getPool().query(
    `SELECT c.id, c.name
     FROM enrollments e
     JOIN classes c ON c.id = e.class_id
     WHERE e.student_id = $1
     ORDER BY c.name`,
    [studentId]
  );
  return result.rows;
}

export async function subjectsForStudent(studentId) {
  const result = await getPool().query(
    `SELECT s.id, s.name, s.class_id,
            c.name AS class_name,
            u.name AS teacher_name
     FROM enrollments e
     JOIN subjects s ON s.class_id = e.class_id
     JOIN classes c ON c.id = s.class_id
     LEFT JOIN users u ON u.id = s.teacher_id
     WHERE e.student_id = $1
     ORDER BY c.name, s.name`,
    [studentId]
  );
  return result.rows;
}

// ===========================================================================
// Subject helpers (teacher scope)
// ===========================================================================

export async function getSubjectFull(id) {
  const result = await getPool().query(
    `SELECT s.*, c.name AS class_name
     FROM subjects s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function subjectBelongsToTeacher(subjectId, teacherId) {
  const result = await getPool().query(
    `SELECT 1 FROM subjects
     WHERE id = $1 AND teacher_id = $2`,
    [subjectId, teacherId]
  );
  return result.rows.length > 0;
}

export async function studentsInClassWithGrades(classId) {
  const result = await getPool().query(
    `SELECT u.id, u.name, u.email,
            g.predicted_gradeclass, g.predicted_letter, g.predicted_gpa,
            g.confidence, g.features_json, g.updated_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     LEFT JOIN grades g ON g.student_id = u.id
     WHERE e.class_id = $1
     ORDER BY u.name`,
    [classId]
  );
  return result.rows;
}

// ===========================================================================
// Notes
// ===========================================================================

export async function createNote(n) {
  const result = await getPool().query(
    `INSERT INTO notes
       (subject_id, class_id, teacher_id, title, filename, stored_path,
        mimetype, char_count, chunk_count, embedded)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      n.subjectId,
      n.classId,
      n.teacherId,
      n.title,
      n.filename,
      n.storedPath,
      n.mimetype,
      n.charCount || 0,
      n.chunkCount || 0,
      n.embedded ? 1 : 0
    ]
  );
  return result.rows[0];
}

export async function getNote(id) {
  const result = await getPool().query(
    "SELECT * FROM notes WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function listNotesBySubject(subjectId) {
  const result = await getPool().query(
    `SELECT * FROM notes
     WHERE subject_id = $1
     ORDER BY created_at DESC`,
    [subjectId]
  );
  return result.rows;
}

export async function deleteNote(id) {
  await getPool().query(
    "DELETE FROM notes WHERE id = $1",
    [id]
  );
}

export async function notesForStudent(studentId) {
  const result = await getPool().query(
    `SELECT n.*, s.name AS subject_name,
            c.name AS class_name, u.name AS teacher_name
     FROM notes n
     JOIN subjects s ON s.id = n.subject_id
     JOIN classes c ON c.id = n.class_id
     JOIN enrollments e
       ON e.class_id = n.class_id AND e.student_id = $1
     LEFT JOIN users u ON u.id = n.teacher_id
     ORDER BY c.name, s.name, n.created_at DESC`,
    [studentId]
  );
  return result.rows;
}

export async function studentCanAccessSubject(studentId, subjectId) {
  const result = await getPool().query(
    `SELECT 1
     FROM subjects s
     JOIN enrollments e ON e.class_id = s.class_id
     WHERE s.id = $1 AND e.student_id = $2`,
    [subjectId, studentId]
  );
  return result.rows.length > 0;
}

// ===========================================================================
// Grades
// ===========================================================================

export async function getGrade(studentId) {
  const result = await getPool().query(
    "SELECT * FROM grades WHERE student_id = $1",
    [studentId]
  );
  return result.rows[0] || null;
}

export async function upsertGrade(g) {
  const result = await getPool().query(
    `INSERT INTO grades
       (student_id, features_json, predicted_gradeclass, predicted_letter,
        predicted_gpa, confidence, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (student_id) DO UPDATE SET
       features_json = EXCLUDED.features_json,
       predicted_gradeclass = EXCLUDED.predicted_gradeclass,
       predicted_letter = EXCLUDED.predicted_letter,
       predicted_gpa = EXCLUDED.predicted_gpa,
       confidence = EXCLUDED.confidence,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      g.studentId,
      JSON.stringify(g.features),
      g.predicted_gradeclass ?? null,
      g.predicted_letter ?? null,
      g.predicted_gpa ?? null,
      g.confidence ?? null,
      g.updatedBy ?? null
    ]
  );
  return result.rows[0];
}

// ===========================================================================
// Emotion reports
// ===========================================================================

export async function createEmotionReport(r) {
  const result = await getPool().query(
    `INSERT INTO emotion_reports
       (student_id, class_id, subject_id, source, emotion, score, severity, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      r.studentId,
      r.classId ?? null,
      r.subjectId ?? null,
      r.source,
      r.emotion,
      r.score ?? null,
      r.severity || "info",
      r.detail ?? null
    ]
  );
  return result.rows[0];
}

export async function emotionReportsForTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT er.*, u.name AS student_name,
            s.name AS subject_name, c.name AS class_name
     FROM emotion_reports er
     JOIN users u ON u.id = er.student_id
     LEFT JOIN subjects s ON s.id = er.subject_id
     LEFT JOIN classes c ON c.id = er.class_id
     WHERE er.subject_id IN (
       SELECT id FROM subjects WHERE teacher_id = $1
     )
     OR (
       er.subject_id IS NULL
       AND er.student_id IN (
         SELECT DISTINCT e.student_id
         FROM subjects ss
         JOIN enrollments e ON e.class_id = ss.class_id
         WHERE ss.teacher_id = $2
       )
     )
     ORDER BY er.created_at DESC`,
    [teacherId, teacherId]
  );
  return result.rows;
}

export async function acknowledgeReport(id) {
  await getPool().query(
    "UPDATE emotion_reports SET acknowledged = TRUE WHERE id = $1",
    [id]
  );
}

export async function unackConcernCountForTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT COUNT(*)::int AS n
     FROM emotion_reports er
     WHERE er.acknowledged = FALSE
       AND er.severity = 'concern'
       AND (
         er.subject_id IN (
           SELECT id FROM subjects WHERE teacher_id = $1
         )
         OR (
           er.subject_id IS NULL
           AND er.student_id IN (
             SELECT DISTINCT e.student_id
             FROM subjects ss
             JOIN enrollments e ON e.class_id = ss.class_id
             WHERE ss.teacher_id = $2
           )
         )
       )`,
    [teacherId, teacherId]
  );
  return result.rows[0].n;
}
