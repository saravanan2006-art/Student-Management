import React, { useEffect, useState } from 'react';
import { api } from './api.js';

const blankStudent = { name: '', dob: '', department: '', year_level: '1', section: '' };
const blankTeacher = { name: '', password: '', department: '', year_level: '1', section: '' };

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}
function SelectField({ label, value, onChange, options }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Login({ onLogin }) {
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await onLogin({ role, username, password }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-card">
      <div className="brand-mark">S</div>
      <p className="eyebrow">ACADEMIC PORTAL</p>
      <h1>Student Management</h1>
      <p className="muted">A single place for student records and results.</p>
      <form onSubmit={submit} className="stack">
        <SelectField label="Login as" value={role} onChange={setRole} options={[
          { value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }, { value: 'admin', label: 'Administrator' }
        ]}/>
        <Field label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder={role === 'admin' ? 'Admin username' : 'Enter your name'} autoComplete="username" required />
        <Field label={role === 'student' ? 'Date of birth (YYYY-MM-DD)' : 'Password'} type={role === 'student' ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={role === 'student' ? '2005-08-21' : 'Enter password'} autoComplete="current-password" required />
        {error && <div className="alert error">{error}</div>}
        <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button>
      </form>
      <p className="login-foot">Access is restricted by your assigned role.</p>
    </section>
  </main>;
}

function Shell({ user, onLogout, children }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><div className="brand-mark small">S</div><div><b>CampusDesk</b><small>ACADEMIC PORTAL</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="side-link active"><span>▦</span> Overview</div>
      <div className="side-bottom">
        <div className="avatar">{(user.name || 'U').slice(0,1).toUpperCase()}</div>
        <div className="user-meta"><b>{user.name}</b><small>{user.role}</small></div>
        <button className="icon-button" title="Sign out" onClick={onLogout}>↗</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">ACADEMIC MANAGEMENT</span><h2>{user.role === 'admin' ? 'Admin dashboard' : user.role === 'teacher' ? 'Teacher dashboard' : 'My academic results'}</h2></div><div className="top-user"><span className="status-dot"></span> Signed in as <b>{user.role}</b></div></header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

function Stat({ label, value, note, tone = '' }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>↗</span></div><strong>{value}</strong><small>{note}</small></div>;
}
function Empty({ children = 'No records yet.' }) { return <div className="empty">{children}</div>; }

function ResultTable({ result }) {
  if (!result?.subjects?.length) return <Empty>No marks have been uploaded yet.</Empty>;
  return <>
    <div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>MARKS</th><th>MAX MARKS</th><th>PERFORMANCE</th></tr></thead>
      <tbody>{result.subjects.map(s => <tr key={s.subject_id}><td className="name-cell">{s.subject_name}</td><td>{s.marks_obtained}</td><td>{s.max_marks}</td><td><div className="progress-cell"><div className="progress"><i style={{ width: `${Math.min(100, s.marks_obtained / s.max_marks * 100)}%` }} /></div><span>{(s.marks_obtained / s.max_marks * 100).toFixed(1)}%</span></div></td></tr>)}</tbody>
    </table></div>
    <div className="result-stats"><Stat label="TOTAL MARKS" value={result.total} note="Marks obtained" /><Stat label="AVERAGE" value={result.average} note="Per entered subject" /><Stat label="OVERALL PERFORMANCE" value={`${result.performance}%`} note="Of maximum available marks" tone="green" /></div>
  </>;
}

function StudentDashboard() {
  const [result, setResult] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/student/my-result').then(setResult).catch(e => setError(e.message)); }, []);
  if (error) return <div className="alert error">{error}</div>;
  if (!result) return <div className="loading">Loading your academic record…</div>;
  return <>
    <div className="welcome-row"><div><p className="eyebrow">STUDENT PROFILE</p><h1>Welcome, {result.student.name}</h1><p className="muted">Here is your academic performance at a glance.</p></div><span className="pill">Read-only view</span></div>
    <div className="profile-strip"><div className="profile-avatar">{result.student.name.slice(0,1).toUpperCase()}</div><div><b>{result.student.name}</b><p>{result.student.department} · Year {result.student.year_level} · Section {result.student.section}</p></div><div className="profile-note"><span className="status-dot"></span> Academic record</div></div>
    <section className="panel"><div className="panel-heading"><div><h3>Subject performance</h3><p>Marks recorded by your teacher</p></div><span className="pill">{result.subjects.length} subjects</span></div><ResultTable result={result}/></section>
  </>;
}

function StudentForm({ initial = blankStudent, onSave, onCancel, admin = false }) {
  const [form, setForm] = useState({ ...initial });
  const [error, setError] = useState('');
  function change(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  async function submit(e) { e.preventDefault(); setError(''); try { await onSave({ ...form, year_level: Number(form.year_level) }); } catch (e) { setError(e.message); } }
  return <form className="form-grid" onSubmit={submit}>
    <Field label="Full name" value={form.name || ''} onChange={e => change('name', e.target.value)} required placeholder="Student full name"/>
    <Field label="Date of birth" type="date" value={form.dob || ''} onChange={e => change('dob', e.target.value)} required/>
    {admin && <Field label="Department" value={form.department || ''} onChange={e => change('department', e.target.value)} required placeholder="e.g. Computer Science"/>}
    {admin && <Field label="Year" type="number" min="1" max="8" value={form.year_level || '1'} onChange={e => change('year_level', e.target.value)} required/>}
    {admin && <Field label="Section" value={form.section || ''} onChange={e => change('section', e.target.value)} required placeholder="e.g. A"/>}
    {error && <div className="alert error span-two">{error}</div>}
    <div className="form-actions span-two"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary">Save student</button></div>
  </form>;
}

function TeacherForm({ onSave, onCancel }) {
  const [form, setForm] = useState(blankTeacher); const [error, setError] = useState('');
  function change(key, value) { setForm(p => ({ ...p, [key]: value })); }
  async function submit(e) { e.preventDefault(); setError(''); try { await onSave({ ...form, year_level: Number(form.year_level) }); } catch (e) { setError(e.message); } }
  return <form className="form-grid" onSubmit={submit}>
    <Field label="Teacher name" value={form.name} onChange={e => change('name', e.target.value)} required placeholder="Full name"/>
    <Field label="Initial password" type="password" value={form.password} onChange={e => change('password', e.target.value)} required minLength="8" placeholder="At least 8 characters"/>
    <Field label="Department" value={form.department} onChange={e => change('department', e.target.value)} required placeholder="e.g. Computer Science"/>
    <Field label="Year" type="number" min="1" max="8" value={form.year_level} onChange={e => change('year_level', e.target.value)} required/>
    <Field label="Section" value={form.section} onChange={e => change('section', e.target.value)} required placeholder="e.g. A"/>
    {error && <div className="alert error span-two">{error}</div>}
    <div className="form-actions span-two"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary">Create teacher</button></div>
  </form>;
}

function AdminDashboard() {
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]); const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(''); const [error, setError] = useState(''); const [query, setQuery] = useState('');
  async function load() { const [s, t] = await Promise.all([api('/admin/students'), api('/admin/teachers')]); setStudents(s); setTeachers(t); }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function createStudent(payload) { await api('/admin/students', { method: 'POST', body: JSON.stringify(payload) }); setForm(''); await load(); }
  async function createTeacher(payload) { await api('/admin/teachers', { method: 'POST', body: JSON.stringify(payload) }); setForm(''); await load(); }
  async function remove(kind, id, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try { await api(`/admin/${kind}/${id}`, { method: 'DELETE' }); await load(); setError(''); } catch(e) { setError(e.message); }
  }
  const shown = (tab === 'students' ? students : teachers).filter(x => `${x.name} ${x.department} ${x.year_level} ${x.section}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="welcome-row"><div><p className="eyebrow">CONTROL CENTER</p><h1>Manage your campus</h1><p className="muted">Manage student records, teacher accounts and class allocations.</p></div><span className="pill green-pill">Administrator</span></div>
    <div className="stats-grid"><Stat label="TOTAL STUDENTS" value={students.length} note="Registered students" tone="blue"/><Stat label="TOTAL TEACHERS" value={teachers.length} note="Allocated classes" tone="green"/><Stat label="CLASS ALLOCATIONS" value={teachers.length} note="One teacher per class" tone="purple"/></div>
    <section className="panel">
      <div className="panel-heading"><div><h3>People directory</h3><p>Manage the records in your system</p></div><button className="primary" onClick={() => setForm(tab === 'students' ? 'student' : 'teacher')}>＋ Add {tab === 'students' ? 'student' : 'teacher'}</button></div>
      <div className="toolbar"><div className="tabs"><button className={tab === 'students' ? 'tab active-tab' : 'tab'} onClick={() => {setTab('students');setForm('');}}>Students</button><button className={tab === 'teachers' ? 'tab active-tab' : 'tab'} onClick={() => {setTab('teachers');setForm('');}}>Teachers & classes</button></div><input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="⌕  Search records…"/></div>
      {error && <div className="alert error">{error}</div>}
      {form === 'student' && <div className="inline-form"><div className="panel-heading"><div><h3>Add student</h3><p>Register a student in a class</p></div></div><StudentForm admin onSave={createStudent} onCancel={() => setForm('')}/></div>}
      {form === 'teacher' && <div className="inline-form"><div className="panel-heading"><div><h3>Add teacher and allocate class</h3><p>Only one teacher can be assigned to a department, year and section.</p></div></div><TeacherForm onSave={createTeacher} onCancel={() => setForm('')}/></div>}
      {shown.length === 0 ? <Empty>No matching records. Add your first {tab === 'students' ? 'student' : 'teacher'}.</Empty> :
        <div className="table-wrap"><table><thead><tr>{(tab === 'students' ? ['STUDENT','DATE OF BIRTH','DEPARTMENT','YEAR','SECTION',''] : ['TEACHER','DEPARTMENT','YEAR','SECTION','CLASS RULE','']).map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>
          {shown.map(x => <tr key={tab === 'students' ? x.student_id : x.teacher_id}>
            <td className="name-cell"><span className="mini-avatar">{x.name.slice(0,1).toUpperCase()}</span>{x.name}</td>
            {tab === 'students' ? <><td>{x.dob}</td><td>{x.department}</td><td>{x.year_level}</td><td>{x.section}</td><td><button className="danger-link" onClick={() => remove('students', x.student_id, x.name)}>Delete</button></td></> :
              <><td>{x.department}</td><td>{x.year_level}</td><td>{x.section}</td><td><span className="pill green-pill">Assigned</span></td><td><button className="danger-link" onClick={() => remove('teachers', x.teacher_id, x.name)}>Delete</button></td></>}
          </tr>)}
        </tbody></table></div>}
    </section>
  </>;
}

function TeacherDashboard({ user }) {
  const [students, setStudents] = useState([]); const [subjects, setSubjects] = useState([]); const [results, setResults] = useState([]);
  const [tab, setTab] = useState('students'); const [form, setForm] = useState(false); const [error, setError] = useState('');
  const [student, setStudent] = useState(blankStudent); const [subjectName, setSubjectName] = useState(''); const [maxMarks, setMaxMarks] = useState('100');
  const [score, setScore] = useState({ student_id: '', subject_id: '', marks_obtained: '' });
  async function load() {
    const [s, sub, r] = await Promise.all([api('/teacher/students'), api('/teacher/subjects'), api('/teacher/results')]);
    setStudents(s); setSubjects(sub); setResults(r);
    setScore(p => ({ ...p, student_id: p.student_id || String(s[0]?.student_id || ''), subject_id: p.subject_id || String(sub[0]?.subject_id || '') }));
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function addStudent(e) { e.preventDefault(); try { await api('/teacher/students', { method: 'POST', body: JSON.stringify(student) }); setStudent(blankStudent); setForm(false); await load(); setError(''); } catch(e) { setError(e.message); } }
  async function removeStudent(s) { if (!confirm(`Delete ${s.name}?`)) return; try { await api(`/teacher/students/${s.student_id}`, { method: 'DELETE' }); await load(); } catch(e) { setError(e.message); } }
  async function addSubject(e) { e.preventDefault(); try { await api('/teacher/subjects', { method: 'POST', body: JSON.stringify({ subject_name: subjectName, max_marks: Number(maxMarks) }) }); setSubjectName(''); await load(); setError(''); } catch(e) { setError(e.message); } }
  async function saveMark(e) { e.preventDefault(); try { await api('/teacher/marks', { method: 'POST', body: JSON.stringify({ ...score, student_id: Number(score.student_id), subject_id: Number(score.subject_id), marks_obtained: Number(score.marks_obtained) }) }); setScore(p => ({ ...p, marks_obtained: '' })); await load(); setError(''); } catch(e) { setError(e.message); } }
  return <>
    <div className="welcome-row"><div><p className="eyebrow">CLASS WORKSPACE</p><h1>Hello, {user.name}</h1><p className="muted">Manage the student records and marks for your assigned class.</p></div><span className="pill green-pill">Teacher</span></div>
    <div className="class-banner"><div className="class-symbol">⌂</div><div><small>YOUR ASSIGNED CLASS</small><h3>{user.department} · Year {user.year_level} · Section {user.section}</h3><p>Access is limited to this class.</p></div><span className="pill">1 teacher per class</span></div>
    <div className="stats-grid"><Stat label="CLASS STUDENTS" value={students.length} note="Students in your class" tone="blue"/><Stat label="SUBJECTS" value={subjects.length} note="Subjects configured" tone="green"/><Stat label="RESULT RECORDS" value={results.filter(r => r.subjects.length).length} note="Students with marks" tone="purple"/></div>
    <section className="panel">
      <div className="panel-heading"><div><h3>Class management</h3><p>Update student records and academic marks</p></div><button className="primary" onClick={() => setForm(v => !v)}>＋ Add student</button></div>
      <div className="tabs wide-tabs"><button className={tab==='students'?'tab active-tab':'tab'} onClick={()=>setTab('students')}>Students</button><button className={tab==='subjects'?'tab active-tab':'tab'} onClick={()=>setTab('subjects')}>Subjects</button><button className={tab==='marks'?'tab active-tab':'tab'} onClick={()=>setTab('marks')}>Upload marks</button><button className={tab==='results'?'tab active-tab':'tab'} onClick={()=>setTab('results')}>Results</button></div>
      {error && <div className="alert error">{error}</div>}
      {form && <form className="form-grid inline-form" onSubmit={addStudent}><Field label="Student name" value={student.name} onChange={e=>setStudent(p=>({...p,name:e.target.value}))} required/><Field label="Date of birth" type="date" value={student.dob} onChange={e=>setStudent(p=>({...p,dob:e.target.value}))} required/><div className="form-actions span-two"><button type="button" className="secondary" onClick={()=>setForm(false)}>Cancel</button><button className="primary">Save student</button></div></form>}
      {tab === 'students' && (students.length ? <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>DATE OF BIRTH</th><th>DEPARTMENT</th><th>YEAR</th><th>SECTION</th><th></th></tr></thead><tbody>{students.map(s=><tr key={s.student_id}><td className="name-cell"><span className="mini-avatar">{s.name.slice(0,1).toUpperCase()}</span>{s.name}</td><td>{s.dob}</td><td>{s.department}</td><td>{s.year_level}</td><td>{s.section}</td><td><button className="danger-link" onClick={()=>removeStudent(s)}>Delete</button></td></tr>)}</tbody></table></div> : <Empty>No students in your class yet.</Empty>)}
      {tab === 'subjects' && <><form className="subject-form" onSubmit={addSubject}><Field label="Subject name" value={subjectName} onChange={e=>setSubjectName(e.target.value)} required placeholder="e.g. Mathematics"/><Field label="Maximum marks" type="number" min="1" step="0.5" value={maxMarks} onChange={e=>setMaxMarks(e.target.value)} required/><button className="primary">Add subject</button></form>{subjects.length ? <div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>MAXIMUM MARKS</th></tr></thead><tbody>{subjects.map(s=><tr key={s.subject_id}><td className="name-cell">{s.subject_name}</td><td>{s.max_marks}</td></tr>)}</tbody></table></div> : <Empty>Add subjects before uploading marks.</Empty>}</>}
      {tab === 'marks' && <><form className="form-grid inline-form" onSubmit={saveMark}>
        <SelectField label="Student" value={score.student_id} onChange={v=>setScore(p=>({...p,student_id:v}))} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/>
        <SelectField label="Subject" value={score.subject_id} onChange={v=>setScore(p=>({...p,subject_id:v}))} options={subjects.map(s=>({value:String(s.subject_id),label:`${s.subject_name} (max ${s.max_marks})`}))}/>
        <Field label="Marks obtained" type="number" min="0" step="0.5" value={score.marks_obtained} onChange={e=>setScore(p=>({...p,marks_obtained:e.target.value}))} required/>
        <div className="form-actions span-two"><button className="primary" disabled={!students.length || !subjects.length}>Save marks</button></div>
      </form>{(!students.length || !subjects.length) && <p className="muted">Add at least one student and one subject first.</p>}</>}
      {tab === 'results' && <>{results.length ? <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>SUBJECTS ENTERED</th><th>TOTAL</th><th>AVERAGE</th><th>PERFORMANCE</th></tr></thead><tbody>{results.map(r=><tr key={r.student.student_id}><td className="name-cell">{r.student.name}</td><td>{r.subjects.length}</td><td>{r.total}</td><td>{r.average}</td><td><span className="pill green-pill">{r.performance}%</span></td></tr>)}</tbody></table></div> : <Empty>No student results yet.</Empty>}</>}
    </section>
  </>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('sms_token');
    if (!token) { setReady(true); return; }
    api('/me').then(data => setUser(data.user)).catch(() => localStorage.removeItem('sms_token')).finally(() => setReady(true));
  }, []);
  async function login(credentials) {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    localStorage.setItem('sms_token', data.token); setUser(data.user);
  }
  function logout() { localStorage.removeItem('sms_token'); setUser(null); }
  if (!ready) return <div className="loading full-loading">Loading portal…</div>;
  if (!user) return <Login onLogin={login}/>;
  return <Shell user={user} onLogout={logout}>
    {user.role === 'student' ? <StudentDashboard/> : user.role === 'teacher' ? <TeacherDashboard user={user}/> : <AdminDashboard/>}
  </Shell>;
}
