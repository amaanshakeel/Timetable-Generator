import { describe, it, expect } from "vitest";
import { fixture } from "../fixture";
import { validateProject } from "../../src/domain/validation";
import { findIssues } from "../../src/domain/issues";
import {
  moveSession,
  swapSessions,
  selectSessions,
} from "../../src/domain/editing";
describe("project integrity", () => {
  it("rejects duplicate offering membership inside a teaching group", () => {
    const p = fixture();
    p.teachingGroups[0].offeringIds = ["o1", "o1"];
    expect(validateProject(p).ok).toBe(false);
  });
  it("warns when existing combined classes no longer meet the combining policy", () => {
    const p = fixture();
    p.subjects[0].combine = false;
    expect(findIssues(p).some((i) => i.kind === "combining")).toBe(true);
    p.subjects[0].combine = true;
    p.subjects[0].maxCombine = 1;
    expect(findIssues(p).some((i) => i.kind === "combining")).toBe(true);
  });
  it("rejects overlapping slots but accepts adjacent slots", () => {
    const p = fixture();
    p.settings.slots[1].start = "09:00";
    expect(validateProject(p).ok).toBe(false);
    p.settings.slots[1].start = p.settings.slots[0].end;
    expect(validateProject(p).ok).toBe(true);
  });
  it("rejects broken references and unknown schema versions", () => {
    const p = fixture();
    p.sessions[0].teacherId = "missing";
    expect(validateProject(p).ok).toBe(false);
    expect(validateProject({ ...fixture(), schemaVersion: 22 }).ok).toBe(false);
  });
  it("detects both participants in global teacher and shared group clashes", () => {
    const p = fixture();
    p.sessions[1].dayId = "Mon";
    const issues = findIssues(p);
    expect(
      issues.some(
        (i) =>
          i.kind === "teacher" &&
          i.sessionIds.includes("s1") &&
          i.sessionIds.includes("s2"),
      ),
    ).toBe(true);
    expect(issues.some((i) => i.kind === "group")).toBe(true);
  });
  it("does not extend occupancy from note text", () => {
    const p = fixture();
    p.sessions[1].dayId = "Mon";
    p.sessions[1].slotId = "p2";
    expect(findIssues(p).some((i) => i.kind === "teacher")).toBe(false);
  });
  it("moves and swaps atomically, retaining notes and respecting locks", () => {
    const p = fixture();
    const moved = moveSession(p, "s1", {
      roomId: "r2",
      dayId: "Wed",
      slotId: "p2",
    });
    expect(moved.sessions[0].dayId).toBe("Wed");
    expect(p.sessions[0].dayId).toBe("Mon");
    expect(moved.sessions[0].note).toBe("2-hour lab");
    const swapped = swapSessions(p, "s1", "s2");
    expect(swapped.sessions[0].dayId).toBe("Tue");
    expect(swapped.sessions[1].dayId).toBe("Mon");
    p.sessions[1].locked = true;
    expect(() => swapSessions(p, "s1", "s2")).toThrow(/unlock/i);
  });
  it("deduplicates filtered combined classes without dropping membership", () => {
    const p = fixture();
    const selected = selectSessions(p, { departmentId: "cs", semester: 1 });
    expect(selected).toHaveLength(2);
    expect(p.teachingGroups[0].offeringIds).toEqual(["o1", "o2"]);
    expect(selectSessions(p, { semester: 2 })).toHaveLength(0);
  });
});
