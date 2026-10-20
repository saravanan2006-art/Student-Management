CREATE DATABASE IF NOT EXISTS student_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_management;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(80) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  section VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_teacher_year CHECK (year_level BETWEEN 1 AND 8),
  CONSTRAINT uq_teacher_class UNIQUE (department, year_level, section)
);

CREATE TABLE IF NOT EXISTS students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  dob DATE NOT NULL,
  department VARCHAR(80) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  section VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_class (department, year_level, section),
  CONSTRAINT chk_student_year CHECK (year_level BETWEEN 1 AND 8)
);

CREATE TABLE IF NOT EXISTS subjects (
  subject_id INT AUTO_INCREMENT PRIMARY KEY,
  subject_name VARCHAR(100) NOT NULL,
  department VARCHAR(80) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  section VARCHAR(20) NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL DEFAULT 100,
  UNIQUE KEY uq_subject_class_name (subject_name, department, year_level, section),
  CONSTRAINT chk_subject_max CHECK (max_marks > 0)
);

CREATE TABLE IF NOT EXISTS marks (
  mark_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  marks_obtained DECIMAL(6,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_subject (student_id, subject_id),
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  CONSTRAINT chk_marks_nonnegative CHECK (marks_obtained >= 0)
);
