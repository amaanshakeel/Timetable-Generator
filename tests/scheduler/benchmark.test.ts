import { it, expect } from "vitest";
import { emptyProject } from "../../src/domain/types";
import { generateCandidate } from "../../src/scheduler/search";
import { findIssues } from "../../src/domain/issues";
it("schedules a synthetic university within a bounded search and returns valid partial results", () => {
  const p = emptyProject();
  p.settings.semesterCount = 5;
  p.settings.slots = p.settings.slots.filter((s) => !s.isBreak);
  p.settings.slots.push({
    id: "p6",
    start: "15:30",
    end: "17:00",
    isBreak: false,
  });
  p.departments = Array.from({ length: 8 }, (_, i) => ({
    id: `d${i}`,
    code: `D${i}`,
    name: `Department ${i}`,
  }));
  p.subjects = Array.from({ length: 15 }, (_, i) => ({
    id: `sub${i}`,
    code: `S${i}`,
    name: `Subject ${i}`,
    combine: false,
  }));
  p.teachers = Array.from({ length: 30 }, (_, i) => ({
    id: `t${i}`,
    name: `Teacher ${i}`,
    subjectIds: [`sub${i % 15}`],
    availability: null,
  }));
  p.rooms = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    name: `CR-${i}`,
    type: "Classroom",
    availability: null,
  }));
  for (const d of p.departments)
    for (let semester = 1; semester <= 5; semester++)
      for (let n = 0; n < 3; n++)
        p.offerings.push({
          id: `${d.id}-${semester}-${n}`,
          subjectId: `sub${(semester * 3 + n) % 15}`,
          departmentId: d.id,
          semester,
          weeklyClasses: 3,
          roomType: "Classroom",
        });
  const r = generateCandidate(p, { budgetMs: 1800, maxNodes: 100000 });
  const actual = findIssues({ ...p, ...r }).filter((i) =>
    [
      "teacher",
      "room",
      "group",
      "eligibility",
      "availability",
      "room-type",
    ].includes(i.kind),
  );
  expect(actual).toHaveLength(0);
  expect(r.sessions.length).toBeGreaterThan(0);
  expect(r.elapsedMs).toBeLessThan(4000);
  console.log(
    JSON.stringify({
      requested: 360,
      scheduled: r.sessions.length,
      unplaced: r.unplaced.reduce((n, u) => n + u.count, 0),
      elapsedMs: r.elapsedMs,
      stop: r.stopReason,
    }),
  );
});
