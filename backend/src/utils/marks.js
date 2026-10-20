
function calculateMarks(subjects) {
  if (!Array.isArray(subjects)) {
    throw new TypeError("Subjects must be an array");
  }

  const completed = subjects.filter(
    (subject) =>
      subject.marks !== null &&
      subject.marks !== undefined
  );

  for (const subject of completed) {
    if (
      typeof subject.marks !== "number" ||
      typeof subject.maxMarks !== "number" ||
      !Number.isFinite(subject.marks) ||
      !Number.isFinite(subject.maxMarks) ||
      subject.maxMarks <= 0 ||
      subject.marks < 0 ||
      subject.marks > subject.maxMarks
    ) {
      throw new Error("Invalid marks");
    }
  }

  const total = completed.reduce(
    (sum, subject) => sum + subject.marks,
    0
  );

  const maxTotal = completed.reduce(
    (sum, subject) => sum + subject.maxMarks,
    0
  );

  const average =
    completed.length > 0 ? total / completed.length : 0;

  const percentage =
    maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return {
    total,
    average,
    percentage,
    completedSubjects: completed.length,
    status: completed.length > 0 ? "Complete" : "Incomplete",
  };
}

module.exports = { calculateMarks };
