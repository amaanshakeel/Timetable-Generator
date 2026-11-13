import type { Project, Placement, TimetableFilter } from "./types";
export function selectSessions(p: Project, filter: TimetableFilter) {
  if (!filter.departmentId && !filter.semester) return p.sessions;
  const ids = new Set(
    p.teachingGroups
      .filter((g) =>
        g.offeringIds.some((id) => {
          const o = p.offerings.find((x) => x.id === id);
          return (
            o &&
            (!filter.departmentId || o.departmentId === filter.departmentId) &&
            (!filter.semester || o.semester === filter.semester)
          );
        }),
      )
      .map((g) => g.id),
  );
  return p.sessions.filter((s) => ids.has(s.teachingGroupId));
}
export function moveSession(p: Project, id: string, to: Placement): Project {
  const s = p.sessions.find((s) => s.id === id);
  if (!s) throw Error("Class not found");
  if (s.locked) throw Error("Unlock the class before moving it");
  return {
    ...p,
    sessions: p.sessions.map((s) => (s.id === id ? { ...s, ...to } : s)),
  };
}
export function swapSessions(p: Project, aId: string, bId: string): Project {
  const a = p.sessions.find((s) => s.id === aId),
    b = p.sessions.find((s) => s.id === bId);
  if (!a || !b) throw Error("Class not found");
  if (a.locked || b.locked) throw Error("Unlock both classes before swapping");
  return {
    ...p,
    sessions: p.sessions.map((s) =>
      s.id === aId
        ? { ...s, roomId: b.roomId, dayId: b.dayId, slotId: b.slotId }
        : s.id === bId
          ? { ...s, roomId: a.roomId, dayId: a.dayId, slotId: a.slotId }
          : s,
    ),
  };
}
