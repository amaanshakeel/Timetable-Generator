import { describe, it, expect } from "vitest";
import { fixture } from "../fixture";
import {
  createTimetable,
  switchTimetable,
  timetableDraftId,
} from "../../src/domain/timetables";
import { validateProject } from "../../src/domain/validation";

describe("saved timetables", () => {
  it("keeps setup and independent classes, notes and locks when switching", () => {
    const original = fixture();
    original.sessions[0].note = "Original note";
    original.sessions[0].locked = true;
    const next = createTimetable(original, "Alternative", {
      teachingGroups: [],
      sessions: [],
    });
    expect(next.id).toBe(original.id);
    expect(next.departments).toEqual(original.departments);
    expect(next.sessions).toHaveLength(0);
    expect(next.savedTimetables).toHaveLength(1);
    const firstId = next.savedTimetables![0].id;
    next.teachers[0].name = "Alternative teacher";
    const restored = switchTimetable(next, firstId);
    expect(timetableDraftId(restored)).toBe(timetableDraftId(original));
    expect(timetableDraftId(next)).not.toBe(timetableDraftId(original));
    expect(restored.sessions).toEqual(original.sessions);
    expect(restored.teachers[0].name).toBe(original.teachers[0].name);
    const returned = switchTimetable(restored, next.activeTimetableId!);
    expect(returned.sessions).toHaveLength(0);
    expect(returned.teachers[0].name).toBe("Alternative teacher");
    expect(switchTimetable(returned, returned.activeTimetableId!)).toBe(
      returned,
    );
  });
  it("validates every snapshot and retains alternatives in backup roundtrips", () => {
    const p = createTimetable(fixture(), "Alternative", {
      teachingGroups: [],
      sessions: [],
    });
    const parsed = validateProject(JSON.parse(JSON.stringify(p)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(parsed.value.savedTimetables).toEqual(p.savedTimetables);
    const broken = structuredClone(p);
    broken.savedTimetables![0].sessions[0].teacherId = "missing";
    expect(validateProject(broken).ok).toBe(false);
    const duplicate = structuredClone(p);
    duplicate.savedTimetables![0].id = duplicate.activeTimetableId!;
    expect(validateProject(duplicate).ok).toBe(false);
    expect(validateProject(fixture()).ok).toBe(true);
    expect(() =>
      createTimetable(p, "Timetable 1", { teachingGroups: [], sessions: [] }),
    ).toThrow(/name/i);
  });
});
