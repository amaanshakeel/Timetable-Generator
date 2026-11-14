import type { Project } from "../domain/types";
export function buildTeachingGroups(p: Project, attempt = 0) {
  const fixedIds = new Set(
    p.sessions.filter((s) => s.locked).map((s) => s.teachingGroupId),
  );
  const fixedGroups = p.teachingGroups.filter((g) => fixedIds.has(g.id));
  const fixedOfferings = new Set(fixedGroups.flatMap((g) => g.offeringIds));

  const groups = [...fixedGroups];
  const remaining = p.offerings.filter((o) => !fixedOfferings.has(o.id));
  const buckets = new Map<string, typeof remaining>();
  for (const o of remaining) {
    const sub = p.subjects.find((s) => s.id === o.subjectId)!;
    const key = `${o.subjectId}|${o.weeklyClasses}|${o.roomType}|${sub.combine ? "shared" : o.id}`;
    buckets.set(key, [...(buckets.get(key) || []), o]);
  }
  for (const offerings of buckets.values()) {
    const subject = p.subjects.find((s) => s.id === offerings[0].subjectId)!;
    const max = subject.combine
      ? Math.min(subject.maxCombine || p.settings.maxCombine, offerings.length)
      : 1;
    const size =
      attempt === 1
        ? 1
        : attempt > 1
          ? Math.max(1, max - (attempt % max))
          : max;
    const ordered = [...offerings];
    if (attempt > 2)
      ordered.sort(
        (a, b) => stableHash(a.id + attempt) - stableHash(b.id + attempt),
      );
    for (let i = 0; i < ordered.length; i += size) {
      const chunk = ordered.slice(i, i + size),
        ids = chunk.map((o) => o.id).sort();
      const old = p.teachingGroups.find(
        (g) =>
          g.subjectId === subject.id &&
          g.offeringIds.length === ids.length &&
          g.offeringIds.every((id) => ids.includes(id)),
      );
      groups.push({
        id: old?.id || `group-${ids.join("_")}`,
        subjectId: subject.id,
        offeringIds: ids,
        weeklyClasses: chunk[0].weeklyClasses,
        roomType: chunk[0].roomType,
      });
    }
  }
  return groups;
}
function stableHash(s: string) {
  let n = 0;
  for (const c of s) n = (n * 31 + c.charCodeAt(0)) | 0;
  return n;
}
