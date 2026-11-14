import { buildTeachingGroups } from "./groups";
import {
  isAvailable,
  type Project,
  type Session,
  type TeachingGroup,
} from "../domain/types";
import { diffTimetables, type ScheduleChange } from "./diff";
export interface SearchOptions {
  budgetMs: number;
  maxNodes?: number;
}
export interface GenerationResult {
  diff: ScheduleChange[];
  teachingGroups: TeachingGroup[];
  sessions: Session[];
  unplaced: { groupId: string; count: number; reason: string }[];
  inputRevision: number;
  stopReason: "complete" | "budget" | "partial";
  changes: string[];
  elapsedMs: number;
}
export interface Progress {
  attempt: number;
  scheduled: number;
  requested: number;
}
export function generateCandidate(
  p: Project,
  options: SearchOptions,
  report?: (p: Progress) => void,
): GenerationResult {
  const start = performance.now(),
    deadline = start + options.budgetMs;
  const locked = p.sessions.filter((s) => s.locked),
    fixedIds = new Set(locked.map((s) => s.teachingGroupId));
  const fixedGroups = p.teachingGroups.filter((g) => fixedIds.has(g.id));
  const fixedOfferings = new Set(fixedGroups.flatMap((g) => g.offeringIds));
  const slots = p.settings.slots.filter((s) => !s.isBreak);
  let best: GenerationResult | undefined,
    bestScore: number[] | undefined,
    nodes = 0;
  const groupKeys = (g: TeachingGroup) =>
    g.offeringIds.map((id) => {
      const o = p.offerings.find((o) => o.id === id)!;
      return `${o.departmentId}|${o.semester}`;
    });
  const score = (groups: TeachingGroup[], sessions: Session[]) => {
    let fulfilled = 0,
      repeats = 0;
    for (const g of groups) {
      const ss = sessions.filter((s) => s.teachingGroupId === g.id);
      fulfilled += Math.min(g.weeklyClasses, ss.length) * g.offeringIds.length;
      repeats += ss.length - new Set(ss.map((s) => s.dayId)).size;
    }
    const loads = p.teachers.map(
      (t) => sessions.filter((s) => s.teacherId === t.id).length,
    );
    return [
      fulfilled,
      -repeats,
      -loads.reduce((a, b) => a + b * b, 0),
      -sessions.length,
    ];
  };
  const isBetter = (a: number[], b?: number[]) =>
    !b ||
    a.some(
      (v, i) =>
        v !== b[i] && a.slice(0, i).every((x, j) => x === b[j]) && v > b[i],
    );
  const totalRequired = p.offerings.reduce((n, o) => n + o.weeklyClasses, 0);
  for (
    let attempt = 0;
    attempt < 10 && performance.now() < deadline;
    attempt++
  ) {
    const groups = buildTeachingGroups(p, attempt);
    const byId = new Map(groups.map((g) => [g.id, g]));
    const sessions = [...locked];
    const workloads = new Map(
      p.teachers.map((t) => [
        t.id,
        locked.filter((s) => s.teacherId === t.id).length,
      ]),
    );
    const jobs = groups
      .flatMap((g) =>
        Array.from(
          {
            length: Math.max(
              0,
              g.weeklyClasses -
                locked.filter((s) => s.teachingGroupId === g.id).length,
            ),
          },
          (_, n) => ({ g, n }),
        ),
      )
      .sort((a, b) => {
        const options = (g: TeachingGroup) =>
          p.teachers
            .filter((t) => t.subjectIds.includes(g.subjectId))
            .reduce(
              (n, t) =>
                n +
                (t.availability?.length ??
                  p.settings.days.length * slots.length),
              0,
            ) * p.rooms.filter((r) => r.type === g.roomType).length;
        return (
          options(a.g) - options(b.g) ||
          b.g.offeringIds.length - a.g.offeringIds.length
        );
      });
    let localBest = [...sessions],
      localScore = score(groups, sessions);
    const attemptEnd = Math.min(
      deadline,
      performance.now() +
        Math.max(25, options.budgetMs / (attempt === 0 ? 3 : 8)),
    );
    const conflicts = (s: Session) => {
      const keys = groupKeys(byId.get(s.teachingGroupId)!);
      return sessions.some(
        (x) =>
          x.dayId === s.dayId &&
          x.slotId === s.slotId &&
          (x.teacherId === s.teacherId ||
            x.roomId === s.roomId ||
            groupKeys(byId.get(x.teachingGroupId)!).some((k) =>
              keys.includes(k),
            )),
      );
    };
    function visit(index: number) {
      if (
        ++nodes > (options.maxNodes || 60000) ||
        performance.now() >= attemptEnd
      )
        return;
      const current = score(groups, sessions);
      if (isBetter(current, localScore)) {
        localScore = current;
        localBest = [...sessions];
      }
      if (index === jobs.length) return;
      const { g, n } = jobs[index];
      const assigned = sessions.find(
        (s) => s.teachingGroupId === g.id,
      )?.teacherId;
      const teachers = p.teachers
        .filter(
          (t) =>
            t.subjectIds.includes(g.subjectId) &&
            (!assigned || t.id === assigned),
        )
        .sort(
          (a, b) => (workloads.get(a.id) || 0) - (workloads.get(b.id) || 0),
        );
      const candidates: { session: Session; priority: number }[] = [];
      for (const t of teachers)
        for (const day of p.settings.days)
          for (const slot of slots) {
            if (!isAvailable(t.availability, day, slot.id)) continue;
            const room = p.rooms
              .filter(
                (r) =>
                  r.type === g.roomType &&
                  isAvailable(r.availability, day, slot.id),
              )
              .find(
                (r) =>
                  !conflicts({
                    id: "",
                    teachingGroupId: g.id,
                    teacherId: t.id,
                    roomId: r.id,
                    dayId: day,
                    slotId: slot.id,
                    note: "",
                    locked: false,
                  }),
              );
            if (!room) continue;
            const old = p.sessions.filter(
              (s) => !s.locked && s.teachingGroupId === g.id,
            )[n];
            const session: Session = {
              id:
                old?.id || availableSessionId(`${g.id}-session-${n}`, sessions),
              teachingGroupId: g.id,
              teacherId: t.id,
              roomId: room.id,
              dayId: day,
              slotId: slot.id,
              note: old?.note || "",
              locked: false,
            };
            const repeat = sessions.some(
              (s) => s.teachingGroupId === g.id && s.dayId === day,
            );
            candidates.push({
              session,
              priority:
                (repeat ? 1000 : 0) +
                (workloads.get(t.id) || 0) * 5 +
                ((p.settings.days.indexOf(day) + attempt) %
                  p.settings.days.length),
            });
          }
      candidates.sort((a, b) => a.priority - b.priority);
      for (const { session } of candidates.slice(0, attempt === 0 ? 12 : 8)) {
        sessions.push(session);
        workloads.set(
          session.teacherId,
          (workloads.get(session.teacherId) || 0) + 1,
        );
        visit(index + 1);
        sessions.pop();
        workloads.set(
          session.teacherId,
          (workloads.get(session.teacherId) || 1) - 1,
        );
        if (
          performance.now() >= attemptEnd ||
          nodes > (options.maxNodes || 60000)
        )
          break;
        if (localScore[0] === totalRequired && localScore[1] === 0) break;
      }
      if (performance.now() < attemptEnd) visit(index + 1);
    }
    visit(0);
    if (isBetter(localScore, bestScore)) {
      bestScore = localScore;
      const unplaced = groups.flatMap((g) => {
        const count =
          g.weeklyClasses -
          localBest.filter((s) => s.teachingGroupId === g.id).length;
        if (count <= 0) return [];
        const teachers = p.teachers.filter((t) =>
          t.subjectIds.includes(g.subjectId),
        );
        const reason = !teachers.length
          ? "No eligible teacher is assigned"
          : !p.rooms.some((r) => r.type === g.roomType)
            ? `No ${g.roomType} room is available`
            : "No suitable placement found within availability, locks and search budget";
        return [{ groupId: g.id, count, reason }];
      });
      best = {
        teachingGroups: groups,
        sessions: localBest,
        unplaced,
        inputRevision: p.revision,
        stopReason: unplaced.length ? "partial" : "complete",
        changes: [],
        diff: [],
        elapsedMs: 0,
      };
    }
    report?.({
      attempt: attempt + 1,
      scheduled: best?.sessions.length || 0,
      requested: jobs.length + locked.length,
    });
    if (bestScore?.[0] === totalRequired && bestScore[1] === 0 && attempt > 1)
      break;
  }
  best ||= {
    teachingGroups: fixedGroups,
    sessions: locked,
    unplaced: p.offerings
      .filter((o) => !fixedOfferings.has(o.id))
      .map((o) => ({
        groupId: o.id,
        count: o.weeklyClasses,
        reason: "Search budget ended before this requirement was placed",
      })),
    inputRevision: p.revision,
    stopReason: "budget",
    changes: [],
    diff: [],
    elapsedMs: 0,
  };
  best.elapsedMs = Math.round(performance.now() - start);
  best.diff = diffTimetables(p, best);
  if (best.unplaced.length && performance.now() >= deadline)
    best.stopReason = "budget";
  for (const g of best.teachingGroups) {
    const old = p.sessions.find((s) => s.teachingGroupId === g.id),
      next = best.sessions.find((s) => s.teachingGroupId === g.id);
    if (next && old?.teacherId !== next.teacherId) {
      const subject = p.subjects.find((s) => s.id === g.subjectId)?.name;
      best.changes.push(
        `${subject}: ${old ? p.teachers.find((t) => t.id === old.teacherId)?.name : "Unassigned"} → ${p.teachers.find((t) => t.id === next.teacherId)?.name}`,
      );
    }
  }
  return best;
}
function availableSessionId(base: string, sessions: Session[]) {
  let id = base,
    index = 1;
  while (sessions.some((s) => s.id === id)) id = `${base}-${index++}`;
  return id;
}
