import { z } from "zod";
import type { Project } from "./types";
const id = z.string().min(1).max(200),
  name = z.string().trim().min(1).max(500),
  positive = z.number().int().min(1).max(100);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const availability = z.array(z.string()).nullable();
const projectSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  savedAt: z.string(),
  settings: z.object({
    university: name,
    term: name,
    semesterCount: positive,
    days: z
      .array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]))
      .min(1)
      .max(7),
    slots: z
      .array(z.object({ id, start: time, end: time, isBreak: z.boolean() }))
      .max(30),
    maxCombine: positive,
    roomTypes: z.array(name).min(1),
  }),
  departments: z.array(
    z.object({ id, name, code: name, semesters: z.array(positive).optional() }),
  ),
  subjects: z.array(
    z.object({
      id,
      name,
      code: name,
      combine: z.boolean(),
      maxCombine: positive.optional(),
    }),
  ),
  offerings: z.array(
    z.object({
      id,
      subjectId: id,
      departmentId: id,
      semester: positive,
      weeklyClasses: positive,
      roomType: name,
    }),
  ),
  teachers: z.array(
    z.object({ id, name, subjectIds: z.array(id), availability }),
  ),
  rooms: z.array(z.object({ id, name, type: name, availability })),
  teachingGroups: z.array(
    z.object({
      id,
      subjectId: id,
      offeringIds: z.array(id).min(1),
      weeklyClasses: positive,
      roomType: name,
    }),
  ),
  sessions: z.array(
    z.object({
      id,
      teachingGroupId: id,
      teacherId: id,
      roomId: id,
      dayId: id,
      slotId: id,
      note: z.string().max(4000),
      locked: z.boolean(),
    }),
  ),
});
export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; error: string };
export const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export function validateProject(value: unknown): ValidationResult<Project> {
  const result = projectSchema.safeParse(value);
  if (!result.success)
    return {
      ok: false,
      error: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 4)
        .join("; "),
    };
  const p = result.data;
  const fail = (error: string): ValidationResult<Project> => ({
    ok: false,
    error,
  });
  for (const list of [
    p.departments,
    p.subjects,
    p.offerings,
    p.teachers,
    p.rooms,
    p.teachingGroups,
    p.sessions,
    p.settings.slots,
  ])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      return fail("Duplicate record IDs");
  if (new Set(p.settings.days).size !== p.settings.days.length)
    return fail("Duplicate teaching days");
  for (const list of [p.departments, p.subjects])
    if (new Set(list.map((x) => x.code.toLowerCase())).size !== list.length)
      return fail("Codes must be unique");
  const slots = [...p.settings.slots].sort(
    (a, b) => minutes(a.start) - minutes(b.start),
  );
  for (let i = 0; i < slots.length; i++) {
    if (minutes(slots[i].start) >= minutes(slots[i].end))
      return fail("A slot must end after it starts");
    if (i && minutes(slots[i].start) < minutes(slots[i - 1].end))
      return fail("Time slots cannot overlap");
  }
  const has = (list: { id: string }[], key: string) =>
    list.some((x) => x.id === key);
  for (const d of p.departments) {
    if (
      d.semesters &&
      (new Set(d.semesters).size !== d.semesters.length ||
        d.semesters.some((n) => n > p.settings.semesterCount))
    )
      return fail(
        "Department semesters must be unique and within the configured semester range",
      );
  }
  const offeringKeys = new Set<string>();
  for (const o of p.offerings) {
    if (
      !has(p.subjects, o.subjectId) ||
      !has(p.departments, o.departmentId) ||
      o.semester > p.settings.semesterCount ||
      !p.settings.roomTypes.includes(o.roomType)
    )
      return fail("An offering references missing setup data");
    const department = p.departments.find((d) => d.id === o.departmentId)!;
    if (department.semesters && !department.semesters.includes(o.semester))
      return fail(
        "A department must include every semester where it has subject offerings. Remove those offerings before removing the semester.",
      );
    const key = `${o.departmentId}|${o.semester}|${o.subjectId}`;
    if (offeringKeys.has(key))
      return fail(
        "This subject is already entered for this department and semester",
      );
    offeringKeys.add(key);
  }
  for (const t of p.teachers)
    if (t.subjectIds.some((s) => !has(p.subjects, s)))
      return fail("A teacher references a missing subject");
  for (const r of p.rooms)
    if (!p.settings.roomTypes.includes(r.type))
      return fail("A room references a missing room type");
  for (const g of p.teachingGroups)
    if (
      new Set(g.offeringIds).size !== g.offeringIds.length ||
      !has(p.subjects, g.subjectId) ||
      g.offeringIds.some(
        (o) =>
          !p.offerings.some((x) => x.id === o && x.subjectId === g.subjectId),
      )
    )
      return fail(
        "A teaching group references a missing or mismatched subject offering",
      );
  for (const s of p.sessions)
    if (
      !has(p.teachingGroups, s.teachingGroupId) ||
      !has(p.teachers, s.teacherId) ||
      !has(p.rooms, s.roomId) ||
      !has(p.settings.slots, s.slotId) ||
      !(p.settings.days as string[]).includes(s.dayId)
    )
      return fail(
        "A class references a missing teacher, room, day, slot or group",
      );
  const keys = new Set(
    p.settings.days.flatMap((d) => p.settings.slots.map((s) => `${d}|${s.id}`)),
  );
  for (const r of [...p.teachers, ...p.rooms])
    if (r.availability?.some((k) => !keys.has(k)))
      return fail("Availability refers to a missing day or slot");
  return { ok: true, value: p as Project };
}
