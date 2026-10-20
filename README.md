# Student Management System (React + Express + MySQL)

A starter full-stack app with three roles:
- Student: can view only their own marks.
- Teacher: can manage students and marks only for their assigned department/year/section.
- Admin: can manage students and teachers and allocate each class to one teacher.

## Requirements
- Node.js 18+
- MySQL 8+

## 1. Create the database
Run `database/schema.sql` in MySQL Workbench.

## 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT secret
npm install
npm run seed-admin
npm run dev
```
Backend runs on http://localhost:4000.

The seed command creates the admin from `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.

## 3. Frontend setup
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Login rules
- Student: username = exact student name; password = date of birth in `YYYY-MM-DD` format.
- Teacher: username = exact teacher name; password = the password set by admin.
- Admin: username/password from `.env`.

Names are unique within the student table and within the teacher table to support name-based login. If your institution has duplicate names, change login to use student ID/roll number and teacher username instead.

## First use
1. Log in as admin.
2. Add a teacher and assign department/year/section.
3. Add students with the same department/year/section.
4. Log out, log in as the teacher, and add subjects/marks for their students.
5. Log in as a student to view their results.

## Marks calculations
The app calculates:
- Total = sum of marks entered.
- Average = total / number of subjects with marks.
- Overall performance (%) = total / sum of each subject's maximum marks * 100.

The teacher can define each subject's maximum marks when adding marks. Each student should have one mark row per subject. The UI shows "Incomplete" until at least one mark exists; for meaningful final results, enter all required subjects.

## Security notes
This is a learning-project starter, not a production-ready school system. It uses JWT bearer tokens and bcrypt password hashing for teacher/admin passwords. Student DOB is the requested login secret and is stored as a date, so it is not strong authentication. For real use, use student IDs/unique usernames plus a chosen password, enforce HTTPS, add rate limiting, audit logs, password reset, and stronger session handling.
