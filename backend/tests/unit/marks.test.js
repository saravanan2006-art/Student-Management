
const { calculateMarks } = require("../../src/utils/marks");

describe("calculateMarks", () => {
  test("calculates total, average, and percentage", () => {
    const result = calculateMarks([
      { marks: 80, maxMarks: 100 },
      { marks: 90, maxMarks: 100 },
    ]);

    expect(result.total).toBe(170);
    expect(result.average).toBe(85);
    expect(result.percentage).toBe(85);
    expect(result.completedSubjects).toBe(2);
  });

  test("ignores subjects without marks", () => {
    const result = calculateMarks([
      { marks: 80, maxMarks: 100 },
      { marks: null, maxMarks: 100 },
    ]);

    expect(result.total).toBe(80);
    expect(result.average).toBe(80);
    expect(result.percentage).toBe(80);
    expect(result.completedSubjects).toBe(1);
  });

  test("returns zero values when no subjects have marks", () => {
    const result = calculateMarks([
      { marks: null, maxMarks: 100 },
    ]);

    expect(result.total).toBe(0);
    expect(result.average).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.status).toBe("Incomplete");
  });

  test("supports different maximum marks", () => {
    const result = calculateMarks([
      { marks: 45, maxMarks: 50 },
      { marks: 80, maxMarks: 100 },
    ]);

    expect(result.total).toBe(125);
    expect(result.average).toBe(62.5);
    expect(result.percentage).toBeCloseTo(83.3333, 3);
  });

  test("rejects marks greater than maximum marks", () => {
    expect(() =>
      calculateMarks([
        { marks: 110, maxMarks: 100 },
      ])
    ).toThrow("Invalid marks");
  });

  test("rejects negative marks", () => {
    expect(() =>
      calculateMarks([
        { marks: -5, maxMarks: 100 },
      ])
    ).toThrow("Invalid marks");
  });

  test("rejects invalid maximum marks", () => {
    expect(() =>
      calculateMarks([
        { marks: 50, maxMarks: 0 },
      ])
    ).toThrow("Invalid marks");
  });

  test("rejects a non-array input", () => {
    expect(() => calculateMarks(null)).toThrow(
      "Subjects must be an array"
    );
  });
});
