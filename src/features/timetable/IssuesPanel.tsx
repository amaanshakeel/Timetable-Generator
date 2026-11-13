import { TriangleAlert, CheckCircle2, Users, Clock3 } from "lucide-react";
import type { Project, Issue } from "../../domain/types";
import { Empty } from "../../components/ui";
export function IssuesPanel({
  project: p,
  issues,
  onInspect,
}: {
  project: Project;
  issues: Issue[];
  onInspect: (id: string) => void;
}) {
  const serious = issues.filter((i) => i.kind !== "repeated-day");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVERY DETAIL, ACCOUNTED FOR</span>
          <h1>Clashes & issues</h1>
          <p>
            University-wide checks, even when timetable filters hide a class.
          </p>
        </div>
        <span className={`status-pill ${issues.length ? "amber" : "green"}`}>
          {issues.length} to review
        </span>
      </div>
      <div className="panel">
        {!issues.length ? (
          <Empty
            title="Everything is in harmony"
            description="No clashes or unmet requirements found in your current setup."
          />
        ) : (
          <>
            <div className="panel-toolbar">
              <TriangleAlert size={18} />
              <strong>{serious.length} conflicts or requirements</strong>
              <span className="muted small">
                {issues.length - serious.length} repeated-day warnings
              </span>
            </div>
            <div className="issues-list">
              {issues.map((i) => (
                <article key={i.id} className="issue-row">
                  <span
                    className={`issue-symbol ${i.kind === "repeated-day" ? "amber" : ""}`}
                  >
                    <TriangleAlert size={19} />
                  </span>
                  <div>
                    <span className="issue-type">
                      {i.kind.replaceAll("-", " ")}
                    </span>
                    <h3>{i.message}</h3>
                    {i.sessionIds.length > 0 && (
                      <div className="filter-row">
                        {i.sessionIds.map((id) => (
                          <button
                            className="btn text-btn"
                            key={id}
                            onClick={() => onInspect(id)}
                          >
                            Open class
                          </button>
                        ))}
                      </div>
                    )}
                    {i.sessionIds.length > 0 && (
                      <p>
                        {i.sessionIds
                          .map((id) => {
                            const s = p.sessions.find((x) => x.id === id),
                              slot = p.settings.slots.find(
                                (t) => t.id === s?.slotId,
                              );
                            return s
                              ? `${s.dayId} ${slot?.start}–${slot?.end} · ${p.rooms.find((r) => r.id === s.roomId)?.name}`
                              : "";
                          })
                          .join(" ↔ ")}
                      </p>
                    )}
                  </div>
                  <span className="badge">
                    {i.sessionIds.length
                      ? `${i.sessionIds.length} classes`
                      : "Setup"}
                  </span>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="soft-note">
        <strong>Warnings update as you work.</strong>
        <p>
          Manual edits are allowed even when they create conflicts. Resolve the
          underlying assignment to clear the red highlighting automatically.
        </p>
      </div>
    </>
  );
}
export function WorkloadPanel({ project: p }: { project: Project }) {
  const max = Math.max(
    1,
    ...p.teachers.map(
      (t) => p.sessions.filter((s) => s.teacherId === t.id).length,
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A BETTER BALANCE</span>
          <h1>Faculty workload</h1>
          <p>
            One shared session counts once, however many departments attend.
          </p>
        </div>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <Users size={19} />
          <h2>Weekly teaching overview</h2>
        </div>
        <div className="workload-list">
          {p.teachers.map((t, i) => {
            const ss = p.sessions.filter((s) => s.teacherId === t.id),
              groups = new Set(ss.map((s) => s.teachingGroupId)),
              subjects = new Set(
                p.teachingGroups
                  .filter((g) => groups.has(g.id))
                  .map((g) => g.subjectId),
              );
            return (
              <article className="workload-row" key={t.id}>
                <span className={`avatar color-${i % 4}`}>
                  {t.name
                    .split(" ")
                    .slice(-2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <strong>{t.name}</strong>
                  <small>
                    {subjects.size} subjects · {groups.size} teaching groups
                  </small>
                </div>
                <div className="load-track">
                  <span style={{ width: `${(ss.length / max) * 100}%` }} />
                </div>
                <span>
                  <strong>{ss.length}</strong> classes / week
                </span>
              </article>
            );
          })}
          {!p.teachers.length && (
            <Empty
              title="Your faculty overview"
              description="Add teachers and generate a timetable to see their weekly workload."
            />
          )}
        </div>
      </div>
      <div className="soft-note">
        <strong>Balance without surprises.</strong>
        <p>
          Generation considers teacher availability and weekly class counts. Any
          automatic assignment changes appear in the review before you apply
          them.
        </p>
      </div>
    </>
  );
}
