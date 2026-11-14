import { uid, type Project, type Placement } from "./types";
import { createTimetable } from "./timetables";
import { buildTeachingGroups } from "../scheduler/groups";
export function createManualTimetable(p: Project, name: string): Project {
  const source = { ...p, sessions: [], teachingGroups: [] };
  return {
    ...createTimetable(p, name, {
      sessions: [],
      teachingGroups: buildTeachingGroups(source),
    }),
    manualWorkspace: true,
  };
}
export function remainingClasses(p: Project) {
  return p.teachingGroups
    .map((g) => ({
      ...g,
      remaining: Math.max(
        0,
        g.weeklyClasses -
          p.sessions.filter((s) => s.teachingGroupId === g.id).length,
      ),
    }))
    .filter((g) => g.remaining > 0);
}
export function placeManualClass(
  p: Project,
  groupId: string,
  teacherId: string,
  to: Placement,
): Project {
  const group = p.teachingGroups.find((g) => g.id === groupId);
  if (!group || !remainingClasses(p).some((g) => g.id === groupId))
    throw Error(
      "This group's weekly classes are already scheduled or the group no longer exists.",
    );
  if (
    !p.teachers.some(
      (t) => t.id === teacherId && t.subjectIds.includes(group.subjectId),
    )
  )
    throw Error("Select an eligible teacher for this subject.");
  if (
    !p.rooms.some((r) => r.id === to.roomId) ||
    !p.settings.days.includes(to.dayId) ||
    !p.settings.slots.some((s) => s.id === to.slotId)
  )
    throw Error("Select a configured room, day and time slot.");
  return {
    ...p,
    sessions: [
      ...p.sessions,
      {
        id: uid(),
        teachingGroupId: groupId,
        teacherId,
        ...to,
        note: "",
        locked: false,
      },
    ],
  };
}

export function reconcileManualGroups(p: Project): Project {
  if (!p.manualWorkspace) return p;
  const assigned = new Set(p.teachingGroups.flatMap((g) => g.offeringIds));
  const remaining = p.offerings.filter((o) => !assigned.has(o.id));
  if (!remaining.length) return p;
  const additions = buildTeachingGroups({
    ...p,
    offerings: remaining,
    teachingGroups: [],
    sessions: [],
  });
  const ids = new Set(p.teachingGroups.map((g) => g.id));
  const groups = additions.map((g) => {
    let id = g.id,
      index = 1;
    while (ids.has(id)) id = `${g.id}-${index++}`;
    ids.add(id);
    return { ...g, id };
  });
  return { ...p, teachingGroups: [...p.teachingGroups, ...groups] };
}
