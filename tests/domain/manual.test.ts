import { it, expect } from "vitest";
import { fixture } from "../fixture";
import {
  createManualTimetable,
  remainingClasses,
  placeManualClass,
  reconcileManualGroups,
} from "../../src/domain/manual";
import { findIssues } from "../../src/domain/issues";
import { validateProject } from "../../src/domain/validation";

it("creates an empty manual timetable from existing setup and preserves the old timetable", () => {
  const original = fixture();
  const p = createManualTimetable(original, "Manual plan");
  expect(p.sessions).toHaveLength(0);
  expect(p.teachers).toEqual(original.teachers);
  expect(p.savedTimetables![0].sessions).toEqual(original.sessions);
  expect(remainingClasses(p).reduce((n, g) => n + g.remaining, 0)).toBe(2);
  expect(validateProject(p).ok).toBe(true);
});
it("allows conflicting manual placements while enforcing eligible teachers and weekly counts", () => {
  let p = createManualTimetable(fixture(), "Manual plan");
  const group = p.teachingGroups[0];
  const to = { roomId: p.rooms[0].id, dayId: "Mon", slotId: "p1" };
  expect(() => placeManualClass(p, group.id, "missing", to)).toThrow(
    /eligible/i,
  );
  p = placeManualClass(p, group.id, p.teachers[0].id, to);
  p = placeManualClass(p, group.id, p.teachers[0].id, to);
  expect(findIssues(p).some((i) => i.kind === "room")).toBe(true);
  expect(remainingClasses(p)).toHaveLength(0);
  expect(() => placeManualClass(p, group.id, p.teachers[0].id, to)).toThrow(
    /weekly/i,
  );
  expect(validateProject(p).ok).toBe(true);
});

it("adds new offerings to a manual workspace without changing placed or locked classes", () => {
  let p = createManualTimetable(fixture(), "Manual plan");
  p = placeManualClass(p, p.teachingGroups[0].id, p.teachers[0].id, {
    roomId: "r1",
    dayId: "Mon",
    slotId: "p1",
  });
  p.sessions[0].locked = true;
  p.sessions[0].note = "Keep this class note";
  const before = structuredClone(p.sessions);
  p.subjects.push({
    id: "physics",
    code: "PHY101",
    name: "Physics",
    combine: false,
  });
  p.offerings.push({
    id: "physics-off",
    subjectId: "physics",
    departmentId: "cs",
    semester: 1,
    weeklyClasses: 1,
    roomType: "Classroom",
  });
  const next = reconcileManualGroups(p);
  expect(next.sessions).toEqual(before);
  expect(
    remainingClasses(next).some(
      (g) => g.subjectId === "physics" && g.remaining === 1,
    ),
  ).toBe(true);
  expect(validateProject(next).ok).toBe(true);
});
