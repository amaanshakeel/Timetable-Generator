import { isAvailable, type Project, type Issue, type Session } from "./types";
export function groupLabel(p: Project, groupId: string) {
  const g = p.teachingGroups.find((x) => x.id === groupId);
  return (
    g?.offeringIds
      .map((id) => {
        const o = p.offerings.find((x) => x.id === id);
        return o
          ? `${p.departments.find((d) => d.id === o.departmentId)?.code} · Sem ${o.semester}`
          : "";
      })
      .filter(Boolean)
      .join(", ") || "Unassigned group"
  );
}
export function findIssues(p: Project): Issue[] {
  const issues: Issue[] = [];
  const add = (
    kind: string,
    message: string,
    sessionIds: string[],
    offeringId?: string,
  ) =>
    issues.push({
      id: `${kind}-${issues.length}`,
      kind,
      message,
      sessionIds,
      ...(offeringId ? { offeringId } : {}),
    });
  const groups = new Map(p.teachingGroups.map((g) => [g.id, g]));
  const label = (s: Session) =>
    `${p.subjects.find((x) => x.id === groups.get(s.teachingGroupId)?.subjectId)?.name || "Class"} (${groupLabel(p, s.teachingGroupId)})`;
  const attending = (s: Session) =>
    new Set(
      groups.get(s.teachingGroupId)?.offeringIds.map((id) => {
        const o = p.offerings.find((x) => x.id === id);
        return `${o?.departmentId}|${o?.semester}`;
      }),
    );
  for (const s of p.sessions) {
    const t = p.teachers.find((x) => x.id === s.teacherId),
      r = p.rooms.find((x) => x.id === s.roomId),
      g = groups.get(s.teachingGroupId),
      slot = p.settings.slots.find((x) => x.id === s.slotId);
    if (!t || !r || !g || !slot) {
      add("invalid", "Class references missing setup data", [s.id]);
      continue;
    }
    if (!isAvailable(t.availability, s.dayId, s.slotId))
      add("availability", `${t.name} is unavailable for ${label(s)}`, [s.id]);
    if (!isAvailable(r.availability, s.dayId, s.slotId))
      add("availability", `${r.name} is unavailable for ${label(s)}`, [s.id]);
    if (!t.subjectIds.includes(g.subjectId))
      add("eligibility", `${t.name} is not assigned to teach this subject`, [
        s.id,
      ]);
    if (r.type !== g.roomType)
      add(
        "room-type",
        `${label(s)} requires ${g.roomType}; ${r.name} is ${r.type}`,
        [s.id],
      );
  }
  for (let i = 0; i < p.sessions.length; i++)
    for (let j = i + 1; j < p.sessions.length; j++) {
      const a = p.sessions[i],
        b = p.sessions[j];
      if (a.dayId !== b.dayId || a.slotId !== b.slotId) continue;
      const ids = [a.id, b.id];
      if (a.teacherId === b.teacherId)
        add(
          "teacher",
          `${p.teachers.find((t) => t.id === a.teacherId)?.name} has overlapping classes on ${a.dayId}`,
          ids,
        );
      if (a.roomId === b.roomId)
        add(
          "room",
          `${p.rooms.find((r) => r.id === a.roomId)?.name} is double-booked on ${a.dayId}`,
          ids,
        );
      const aa = attending(a);
      if ([...attending(b)].some((k) => aa.has(k)))
        add("group", `${label(a)} overlaps ${label(b)}`, ids);
    }
  for (const g of p.teachingGroups) {
    const ss = p.sessions.filter((s) => s.teachingGroupId === g.id);
    const subject = p.subjects.find((s) => s.id === g.subjectId);
    if (
      g.offeringIds.length > 1 &&
      (!subject?.combine ||
        g.offeringIds.length > (subject.maxCombine || p.settings.maxCombine))
    )
      add(
        "combining",
        `${subject?.name} no longer meets its combining permission or maximum group limit`,
        ss.map((s) => s.id),
        g.offeringIds[0],
      );
    if (
      g.offeringIds.some((id) => {
        const o = p.offerings.find((o) => o.id === id);
        return (
          o &&
          (o.weeklyClasses !== g.weeklyClasses || o.roomType !== g.roomType)
        );
      })
    )
      add(
        "combining",
        `${subject?.name} has incompatible weekly counts or room requirements in its teaching group`,
        ss.map((s) => s.id),
        g.offeringIds[0],
      );
    for (const day of p.settings.days) {
      const same = ss.filter((s) => s.dayId === day);
      if (same.length > 1)
        add(
          "repeated-day",
          `${p.subjects.find((s) => s.id === g.subjectId)?.name} meets ${same.length} times on ${day} for ${groupLabel(p, g.id)}`,
          same.map((s) => s.id),
        );
    }
    if (new Set(ss.map((s) => s.teacherId)).size > 1)
      add(
        "teacher-consistency",
        "This teaching group has different teachers across its weekly classes",
        ss.map((s) => s.id),
      );
  }
  for (const o of p.offerings) {
    const gs = p.teachingGroups.filter((g) => g.offeringIds.includes(o.id));
    const ss = p.sessions.filter((s) =>
      gs.some((g) => g.id === s.teachingGroupId),
    );
    if (ss.length !== o.weeklyClasses)
      add(
        "requirement",
        `${p.subjects.find((s) => s.id === o.subjectId)?.name} · ${p.departments.find((d) => d.id === o.departmentId)?.code} Sem ${o.semester}: ${ss.length} of ${o.weeklyClasses} weekly classes scheduled`,
        ss.map((s) => s.id),
        o.id,
      );
    if (gs.length > 1)
      add(
        "duplicate-assignment",
        "A subject offering belongs to multiple teaching groups",
        ss.map((s) => s.id),
        o.id,
      );
  }
  return issues;
}
