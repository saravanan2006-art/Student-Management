require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { requireAuth, allowRoles } = require('./auth');

const app = express();
app.use(cors({
  origin: "http://65.1.91.137:5173"
}));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });
const cleanClass = body => ({
  department: String(body.department || '').trim(),
  year_level: Number(body.year_level),
  section: String(body.section || '').trim()
});
function validClass(c) {
  return c.department && Number.isInteger(c.year_level) && c.year_level >= 1 &&
    c.year_level <= 8 && c.section;
}
async function teacherOwnsClass(user, c) {
  const [rows] = await pool.execute(
    'SELECT teacher_id FROM teachers WHERE teacher_id=? AND department=? AND year_level=? AND section=?',
    [user.id, c.department, c.year_level, c.section]
  );
  return rows.length > 0;
}
async function getStudentResult(studentId) {
  const [rows] = await pool.execute(
    `SELECT s.student_id, s.name, s.department, s.year_level, s.section,
            sub.subject_id, sub.subject_name, sub.max_marks,
            m.marks_obtained
     FROM students s
     LEFT JOIN marks m ON m.student_id=s.student_id
     LEFT JOIN subjects sub ON sub.subject_id=m.subject_id
     WHERE s.student_id=?
     ORDER BY sub.subject_name`,
    [studentId]
  );
  if (!rows.length) return null;
  const subjects = rows.filter(r => r.subject_id).map(r => ({
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    max_marks: Number(r.max_marks),
    marks_obtained: Number(r.marks_obtained)
  }));
  const total = subjects.reduce((sum, x) => sum + x.marks_obtained, 0);
  const maxTotal = subjects.reduce((sum, x) => sum + x.max_marks, 0);
  const average = subjects.length ? total / subjects.length : 0;
  const performance = maxTotal ? (total / maxTotal) * 100 : 0;
  return {
    student: {
      student_id: rows[0].student_id, name: rows[0].name,
      department: rows[0].department, year_level: rows[0].year_level,
      section: rows[0].section
    },
    subjects, total: Number(total.toFixed(2)),
    average: Number(average.toFixed(2)),
    performance: Number(performance.toFixed(2))
  };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Student login uses name + DOB (YYYY-MM-DD); teacher/admin passwords are bcrypt hashes.
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { role, username, password } = req.body || {};
  if (!['student', 'teacher', 'admin'].includes(role) || !username || !password) {
    return res.status(400).json({ error: 'Role, username, and password are required.' });
  }
  let user;
  if (role === 'student') {
    const [rows] = await pool.execute(
      'SELECT student_id, name, dob FROM students WHERE name=?',
      [String(username).trim()]
    );
    if (rows.length && rows[0].dob === String(password)) {
      user = { id: rows[0].student_id, name: rows[0].name, role: 'student' };
    }
  } else if (role === 'teacher') {
    const [rows] = await pool.execute(
      'SELECT teacher_id, name, password_hash, department, year_level, section FROM teachers WHERE name=?',
      [String(username).trim()]
    );
    if (rows.length && await bcrypt.compare(String(password), rows[0].password_hash)) {
      const t = rows[0];
      user = { id: t.teacher_id, name: t.name, role: 'teacher',
        department: t.department, year_level: t.year_level, section: t.section };
    }
  } else {
    const [rows] = await pool.execute('SELECT admin_id, username, password_hash FROM admins WHERE username=?', [String(username).trim()]);
    if (rows.length && await bcrypt.compare(String(password), rows[0].password_hash)) {
      user = { id: rows[0].admin_id, name: rows[0].username, role: 'admin' };
    }
  }
  if (!user) return res.status(401).json({ error: 'Invalid login details.' });
  return res.json({ token: tokenFor(user), user });
}));

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

// Student can only fetch the student record associated with their own token.
app.get('/api/student/my-result', requireAuth, allowRoles('student'), asyncRoute(async (req, res) => {
  const result = await getStudentResult(req.user.id);
  if (!result) return res.status(404).json({ error: 'Student record not found.' });
  res.json(result);
}));

// Admin: list/add/delete students.
app.get('/api/admin/students', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT student_id, name, dob, department, year_level, section FROM students ORDER BY department, year_level, section, name'
  );
  res.json(rows);
}));

app.post('/api/admin/students', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const { name, dob } = req.body || {};
  const c = cleanClass(req.body || {});
  if (!String(name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob || '')) || !validClass(c)) {
    return res.status(400).json({ error: 'Provide name, DOB (YYYY-MM-DD), department, year (1-8), and section.' });
  }
  const [result] = await pool.execute(
    'INSERT INTO students (name, dob, department, year_level, section) VALUES (?, ?, ?, ?, ?)',
    [String(name).trim(), dob, c.department, c.year_level, c.section]
  );
  res.status(201).json({ student_id: result.insertId, message: 'Student created.' });
}));

app.delete('/api/admin/students/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM students WHERE student_id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Student not found.' });
  res.json({ message: 'Student deleted.' });
}));

// Admin: list/add/delete teachers. Class uniqueness is also enforced by MySQL.
app.get('/api/admin/teachers', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT teacher_id, name, department, year_level, section FROM teachers ORDER BY department, year_level, section'
  );
  res.json(rows);
}));

app.post('/api/admin/teachers', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const { name, password } = req.body || {};
  const c = cleanClass(req.body || {});
  if (!String(name || '').trim() || !String(password || '') || !validClass(c)) {
    return res.status(400).json({ error: 'Provide name, password, department, year (1-8), and section.' });
  }
  const hash = await bcrypt.hash(String(password), 12);
  const [result] = await pool.execute(
    'INSERT INTO teachers (name, password_hash, department, year_level, section) VALUES (?, ?, ?, ?, ?)',
    [String(name).trim(), hash, c.department, c.year_level, c.section]
  );
  res.status(201).json({ teacher_id: result.insertId, message: 'Teacher created and class allocated.' });
}));

app.delete('/api/admin/teachers/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM teachers WHERE teacher_id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Teacher not found.' });
  res.json({ message: 'Teacher deleted.' });
}));

// Admin can update student details. Teacher routes below are restricted to their assigned class.
app.put('/api/admin/students/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const { name, dob } = req.body || {};
  const c = cleanClass(req.body || {});
  if (!String(name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob || '')) || !validClass(c)) {
    return res.status(400).json({ error: 'Invalid student details.' });
  }
  const [result] = await pool.execute(
    'UPDATE students SET name=?, dob=?, department=?, year_level=?, section=? WHERE student_id=?',
    [String(name).trim(), dob, c.department, c.year_level, c.section, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Student not found or unchanged.' });
  res.json({ message: 'Student updated.' });
}));

app.put('/api/admin/teachers/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const { name, password } = req.body || {};
  const c = cleanClass(req.body || {});
  if (!String(name || '').trim() || !validClass(c)) return res.status(400).json({ error: 'Invalid teacher details.' });
  const params = [String(name).trim(), c.department, c.year_level, c.section];
  let sql = 'UPDATE teachers SET name=?, department=?, year_level=?, section=?';
  if (password) {
    sql += ', password_hash=?';
    params.push(await bcrypt.hash(String(password), 12));
  }
  sql += ' WHERE teacher_id=?';
  params.push(req.params.id);
  const [result] = await pool.execute(sql, params);
  if (!result.affectedRows) return res.status(404).json({ error: 'Teacher not found or unchanged.' });
  res.json({ message: 'Teacher updated.' });
}));

app.get('/api/teacher/students', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const [rows] = await pool.execute(
    `SELECT student_id, name, dob, department, year_level, section
     FROM students WHERE department=? AND year_level=? AND section=? ORDER BY name`,
    [t.department, t.year_level, t.section]
  );
  res.json(rows);
}));

app.post('/api/teacher/students', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const { name, dob } = req.body || {};
  const t = req.user;
  if (!String(name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) {
    return res.status(400).json({ error: 'Provide student name and DOB (YYYY-MM-DD).' });
  }
  const [result] = await pool.execute(
    'INSERT INTO students (name, dob, department, year_level, section) VALUES (?, ?, ?, ?, ?)',
    [String(name).trim(), dob, t.department, t.year_level, t.section]
  );
  res.status(201).json({ student_id: result.insertId, message: 'Student created.' });
}));

app.delete('/api/teacher/students/:id', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const [result] = await pool.execute(
    'DELETE FROM students WHERE student_id=? AND department=? AND year_level=? AND section=?',
    [req.params.id, t.department, t.year_level, t.section]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Student not found in your assigned class.' });
  res.json({ message: 'Student deleted.' });
}));

app.put('/api/teacher/students/:id', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const { name, dob } = req.body || {};
  if (!String(name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) {
    return res.status(400).json({ error: 'Provide student name and DOB (YYYY-MM-DD).' });
  }
  const [result] = await pool.execute(
    `UPDATE students SET name=?, dob=?
     WHERE student_id=? AND department=? AND year_level=? AND section=?`,
    [String(name).trim(), dob, req.params.id, t.department, t.year_level, t.section]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Student not found in your assigned class or no changes made.' });
  res.json({ message: 'Student updated.' });
}));

app.get('/api/teacher/subjects', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const [rows] = await pool.execute(
    'SELECT subject_id, subject_name, max_marks FROM subjects WHERE department=? AND year_level=? AND section=? ORDER BY subject_name',
    [t.department, t.year_level, t.section]
  );
  res.json(rows);
}));

app.post('/api/teacher/subjects', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const subjectName = String((req.body || {}).subject_name || '').trim();
  const maxMarks = Number((req.body || {}).max_marks || 100);
  if (!subjectName || !Number.isFinite(maxMarks) || maxMarks <= 0) return res.status(400).json({ error: 'Enter a subject name and positive maximum marks.' });
  const [result] = await pool.execute(
    'INSERT INTO subjects (subject_name, department, year_level, section, max_marks) VALUES (?, ?, ?, ?, ?)',
    [subjectName, t.department, t.year_level, t.section, maxMarks]
  );
  res.status(201).json({ subject_id: result.insertId, message: 'Subject created.' });
}));

app.post('/api/teacher/marks', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const { student_id, subject_id, marks_obtained } = req.body || {};
  const score = Number(marks_obtained);
  if (!Number.isFinite(score) || score < 0) return res.status(400).json({ error: 'Marks must be a non-negative number.' });
  const [allowed] = await pool.execute(
    `SELECT s.student_id, sub.subject_id, sub.max_marks
     FROM students s JOIN subjects sub
       ON sub.department=s.department AND sub.year_level=s.year_level AND sub.section=s.section
     WHERE s.student_id=? AND sub.subject_id=?
       AND s.department=? AND s.year_level=? AND s.section=?
       AND sub.department=? AND sub.year_level=? AND sub.section=?`,
    [student_id, subject_id, t.department, t.year_level, t.section, t.department, t.year_level, t.section]
  );
  if (!allowed.length) return res.status(403).json({ error: 'Student or subject is outside your assigned class.' });
  if (score > Number(allowed[0].max_marks)) return res.status(400).json({ error: `Marks cannot exceed ${allowed[0].max_marks}.` });
  await pool.execute(
    `INSERT INTO marks (student_id, subject_id, marks_obtained) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained)`,
    [student_id, subject_id, score]
  );
  res.json({ message: 'Marks saved.' });
}));

app.get('/api/teacher/results', requireAuth, allowRoles('teacher'), asyncRoute(async (req, res) => {
  const t = req.user;
  const [students] = await pool.execute(
    'SELECT student_id FROM students WHERE department=? AND year_level=? AND section=? ORDER BY name',
    [t.department, t.year_level, t.section]
  );
  const results = [];
  for (const s of students) results.push(await getStudentResult(s.student_id));
  res.json(results.filter(Boolean));
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That name or class allocation already exists. Names must be unique, and each class can have only one teacher.' });
  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Related record does not exist.' });
  res.status(500).json({ error: 'Server error. Check the backend terminal for details.' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
