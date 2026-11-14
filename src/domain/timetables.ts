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

export function nextTimetableName(p: Project) {
  let n = timetableOptions(p).length + 1;
  while (
    timetableOptions(p).some((t) => t.name.toLowerCase() === `timetable ${n}`)
  )
    n++;
  return `Timetable ${n}`;
}
export function deleteTimetable(p: Project, id: string): Project {
  const active = p.activeTimetableId || p.id;
  if (id !== active) {
    if (!p.savedTimetables?.some((t) => t.id === id))
      throw Error("This timetable could not be found.");
    return {
      ...p,
      savedTimetables: p.savedTimetables.filter((t) => t.id !== id),
    };
  }
  if (p.savedTimetables?.length) {
    const next = switchTimetable(p, p.savedTimetables[0].id);
    return {
      ...next,
      savedTimetables: next.savedTimetables!.filter((t) => t.id !== id),
    };
  }
  return {
    ...p,
    sessions: [],
    teachingGroups: [],
    activeTimetableId: undefined,
    timetableName: undefined,
    savedTimetables: undefined,
  };
}
export function savedTimetableSummaries(p: Project) {
  return [
    ...(p.sessions.length || p.activeTimetableId
      ? [
          {
            id: p.activeTimetableId || p.id,
            name: p.timetableName || "Timetable 1",
            term: p.settings.term,
            classes: p.sessions.length,
            active: true,
          },
        ]
      : []),
    ...(p.savedTimetables || []).map((t) => ({
      id: t.id,
      name: t.name,
      term: t.settings.term,
      classes: t.sessions.length,
      active: false,
    })),
  ];
}

export function hasRemovedTimetable(previous: Project, next: Project) {
  const retained = new Set(savedTimetableSummaries(next).map((t) => t.id));
  return savedTimetableSummaries(previous).some((t) => !retained.has(t.id));
}
