import type { Project, Session, TeachingGroup } from "../domain/types";
export interface ScheduleChange {
  kind: "placement" | "group" | "addition" | "removal" | "note";
  label: string;
  before: string;
  after: string;
}
export function diffTimetables(
  p: Project,
  next: { sessions: Session[]; teachingGroups: TeachingGroup[] },
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  const membership = (g: TeachingGroup) =>
    g.offeringIds
      .map((id) => {
        const o = p.offerings.find((o) => o.id === id);
        return o
          ? `${p.departments.find((d) => d.id === o.departmentId)?.code} Sem ${o.semester}`
          : id;
      })
      .join(", ");
  const subject = (g?: TeachingGroup) =>
    p.subjects.find((s) => s.id === g?.subjectId)?.name || "Class";
  const placement = (s: Session) => {
    const slot = p.settings.slots.find((t) => t.id === s.slotId);
    return `${s.dayId} ${slot?.start}–${slot?.end} · ${p.rooms.find((r) => r.id === s.roomId)?.name} · ${p.teachers.find((t) => t.id === s.teacherId)?.name}${s.locked ? " · Locked" : ""}`;
  };
  for (const g of p.teachingGroups) {
    const after = next.teachingGroups.find((x) => x.id === g.id);
    if (!after)
      changes.push({
        kind: "group",
        label: subject(g),
        before: membership(g),
        after: "Group dissolved or regrouped",
      });
    else if (
      JSON.stringify(g.offeringIds) !== JSON.stringify(after.offeringIds)
    )
      changes.push({
        kind: "group",
        label: subject(g),
        before: membership(g),
        after: membership(after),
      });
  }
  for (const g of next.teachingGroups)
    if (!p.teachingGroups.some((old) => old.id === g.id))
      changes.push({
        kind: "group",
        label: subject(g),
        before: "New teaching group",
        after: membership(g),
      });
  for (const old of p.sessions) {
    const after = next.sessions.find((s) => s.id === old.id),
      group = p.teachingGroups.find((g) => g.id === old.teachingGroupId);
    if (!after) {
      changes.push({
        kind: "removal",
        label: `${subject(group)} · ${group ? membership(group) : ""}`,
        before: placement(old),
        after: "Class removed or replaced",
      });
      if (old.note)
        changes.push({
          kind: "note",
          label: subject(group),
          before: old.note,
          after:
            "Note belongs to the removed class; it will not carry over automatically",
        });
    } else {
      if (
        ["dayId", "slotId", "roomId", "teacherId", "teachingGroupId"].some(
          (key) => old[key as keyof Session] !== after[key as keyof Session],
        )
      )
        changes.push({
          kind: "placement",
          label: `${subject(group)} · ${group ? membership(group) : ""}`,
          before: placement(old),
          after: placement(after),
        });
      if (old.note !== after.note)
        changes.push({
          kind: "note",
          label: subject(group),
          before: old.note || "(No note)",
          after: after.note || "(No note)",
        });
    }
  }
  for (const s of next.sessions)
    if (!p.sessions.some((old) => old.id === s.id)) {
      const g = next.teachingGroups.find((g) => g.id === s.teachingGroupId);
      changes.push({
        kind: "addition",
        label: `${subject(g)} · ${g ? membership(g) : ""}`,
        before: "New scheduled class",
        after: placement(s),
      });
    }
  return changes;
}
