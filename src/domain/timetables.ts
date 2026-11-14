import {
  uid,
  type Project,
  type SavedTimetable,
  type TimetableData,
} from "./types";

function data(p: TimetableData): TimetableData {
  const {
    settings,
    departments,
    subjects,
    offerings,
    teachers,
    rooms,
    teachingGroups,
    sessions,
  } = p;
  return structuredClone({
    settings,
    departments,
    subjects,
    offerings,
    teachers,
    rooms,
    teachingGroups,
    sessions,
  });
}
export function timetableOptions(p: Project) {
  return [
    { id: p.activeTimetableId || p.id, name: p.timetableName || "Timetable 1" },
    ...(p.savedTimetables || []).map((t) => ({ id: t.id, name: t.name })),
  ];
}
function snapshot(p: Project): SavedTimetable {
  return {
    ...data(p),
    id: p.activeTimetableId || p.id,
    name: p.timetableName || "Timetable 1",
  };
}
export function createTimetable(
  p: Project,
  name: string,
  schedule: Pick<Project, "teachingGroups" | "sessions">,
): Project {
  const trimmed = name.trim();
  if (
    !trimmed ||
    timetableOptions(p).some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    )
  )
    throw Error("Choose a unique timetable name.");
  return {
    ...p,
    ...data({ ...p, ...schedule }),
    activeTimetableId: uid(),
    timetableName: trimmed,
    savedTimetables: [...(p.savedTimetables || []), snapshot(p)],
  };
}
export function switchTimetable(p: Project, id: string): Project {
  if (id === (p.activeTimetableId || p.id)) return p;
  const target = p.savedTimetables?.find((t) => t.id === id);
  if (!target) throw Error("This saved timetable could not be found.");
  return {
    ...p,
    ...data(target),
    activeTimetableId: target.id,
    timetableName: target.name,
    savedTimetables: [
      ...(p.savedTimetables || []).filter((t) => t.id !== id),
      snapshot(p),
    ],
  };
}

export function timetableDraftId(p: Project) {
  return p.activeTimetableId && p.activeTimetableId !== p.id
    ? `${p.id}-${p.activeTimetableId}`
    : p.id;
}
