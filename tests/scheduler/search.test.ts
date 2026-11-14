import { it, expect } from "vitest";
import { fixture } from "../fixture";
import { generateCandidate } from "../../src/scheduler/search";
import { findIssues } from "../../src/domain/issues";
import { validateProject } from "../../src/domain/validation";
it("preserves manually locked break classes while generating new classes only in teaching slots", () => {
  const p = fixture();
  p.sessions[0].slotId = "p3";
  p.sessions[0].locked = true;
  const r = generateCandidate(p, { budgetMs: 150 });
  expect(r.sessions.find((s) => s.id === "s1")?.slotId).toBe("p3");
  expect(
    r.sessions.filter((s) => !s.locked).every((s) => s.slotId !== "p3"),
  ).toBe(true);
});
it("can complete a partially generated group after locking its only placed session", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.teachers[0].availability = ["Mon|p1"];
  const partial = generateCandidate(p, { budgetMs: 120 });
  const locked = { ...p, ...partial };
  locked.sessions.forEach((s) => (s.locked = true));
  locked.teachers[0].availability = null;
  const completed = generateCandidate(locked, { budgetMs: 150 });
  expect(completed.sessions).toHaveLength(2);
  expect(new Set(completed.sessions.map((s) => s.id)).size).toBe(2);
  expect(validateProject({ ...locked, ...completed }).ok).toBe(true);
});
it("previews placement and membership changes even when the teachers stay the same", () => {
  const p = fixture();
  p.sessions[0].dayId = "Fri";
  p.sessions[1].dayId = "Thu";
  const r = generateCandidate(p, { budgetMs: 150 });
  expect(r.diff.some((d) => d.kind === "placement")).toBe(true);
  p.subjects[0].combine = false;
  const split = generateCandidate(p, { budgetMs: 150 });
  expect(split.diff.some((d) => d.kind === "group")).toBe(true);
});
it("combines approved compatible offerings and satisfies weekly requirements without clashes", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  const r = generateCandidate(p, { budgetMs: 250 });
  expect(r.unplaced).toHaveLength(0);
  expect(r.teachingGroups).toHaveLength(1);
  expect(r.sessions).toHaveLength(2);
  expect(new Set(r.sessions.map((s) => s.dayId)).size).toBe(2);
  expect(
    findIssues({ ...p, ...r }).filter((i) =>
      ["teacher", "room", "group"].includes(i.kind),
    ),
  ).toHaveLength(0);
});
it("keeps unchecked subjects separate and enforces combining maximum", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.subjects[0].combine = false;
  expect(generateCandidate(p, { budgetMs: 250 }).teachingGroups).toHaveLength(
    2,
  );
  p.subjects[0].combine = true;
  p.subjects[0].maxCombine = 1;
  expect(generateCandidate(p, { budgetMs: 250 }).teachingGroups).toHaveLength(
    2,
  );
});
it("does not combine incompatible class counts", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.offerings[1].weeklyClasses = 1;
  expect(generateCandidate(p, { budgetMs: 250 }).teachingGroups).toHaveLength(
    2,
  );
});
it("retains locked placements, notes, teacher and membership", () => {
  const p = fixture();
  p.sessions[0].locked = true;
  const r = generateCandidate(p, { budgetMs: 250 });
  expect(r.sessions.find((s) => s.id === "s1")).toEqual(p.sessions[0]);
  expect(r.teachingGroups.find((g) => g.id === "g1")?.offeringIds).toEqual([
    "o1",
    "o2",
  ]);
});
it("reports missing teacher eligibility without generating conflicts", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.teachers = [];
  const r = generateCandidate(p, { budgetMs: 100 });
  expect(r.sessions).toHaveLength(0);
  expect(r.unplaced.length).toBeGreaterThan(0);
  expect(r.unplaced[0].reason).toMatch(/teacher/i);
});
it("warns about repeated days when only one day is available", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.settings.days = ["Mon"];
  const r = generateCandidate(p, { budgetMs: 250 });
  expect(r.sessions).toHaveLength(2);
  expect(
    findIssues({ ...p, ...r }).some((i) => i.kind === "repeated-day"),
  ).toBe(true);
});
it("explores separate groups when combined attendance has no common availability", () => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  p.offerings.forEach((o) => (o.weeklyClasses = 1));
  p.subjects.push({ id: "x", code: "X", name: "Fixed", combine: false });
  p.offerings.push(
    {
      id: "o3",
      subjectId: "x",
      departmentId: "cs",
      semester: 1,
      weeklyClasses: 1,
      roomType: "Classroom",
    },
    {
      id: "o4",
      subjectId: "x",
      departmentId: "se",
      semester: 1,
      weeklyClasses: 1,
      roomType: "Classroom",
    },
  );
  p.settings.days = ["Mon"];
  p.settings.slots = p.settings.slots.slice(0, 2);
  p.teachers.push({
    id: "t2",
    name: "Fixed teacher",
    subjectIds: ["x"],
    availability: null,
  });
  p.teachingGroups = [
    {
      id: "gx",
      subjectId: "x",
      offeringIds: ["o3"],
      weeklyClasses: 1,
      roomType: "Classroom",
    },
    {
      id: "gy",
      subjectId: "x",
      offeringIds: ["o4"],
      weeklyClasses: 1,
      roomType: "Classroom",
    },
  ];
  p.sessions = [
    {
      id: "sx",
      teachingGroupId: "gx",
      teacherId: "t2",
      roomId: "r2",
      dayId: "Mon",
      slotId: "p1",
      note: "",
      locked: true,
    },
    {
      id: "sy",
      teachingGroupId: "gy",
      teacherId: "t2",
      roomId: "r2",
      dayId: "Mon",
      slotId: "p2",
      note: "",
      locked: true,
    },
  ];
  const r = generateCandidate(p, { budgetMs: 400 });
  expect(r.unplaced).toHaveLength(0);
  expect(r.sessions).toHaveLength(4);
});
