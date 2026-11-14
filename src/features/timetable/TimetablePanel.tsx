import { useEffect, useState } from "react";
import {
  Filter,
  ChevronDown,
  Plus,
  LockKeyhole,
  TriangleAlert,
  GripVertical,
  CalendarDays,
  ArrowUpRight,
  Clock3,
  Users,
  Building2,
  Layers,
  MousePointer2,
} from "lucide-react";
import {
  type Project,
  type Session,
  type TimetableFilter,
  type Issue,
  type Placement,
} from "../../domain/types";
import {
  selectSessions,
  moveSession,
  swapSessions,
  emptyBreakSlotIds,
} from "../../domain/editing";
import { timetableOptions, timetableDraftId } from "../../domain/timetables";
import { groupLabel } from "../../domain/issues";
import {
  Modal,
  Form,
  Field,
  Empty,
  useDraft,
  DraftNotice,
} from "../../components/ui";
export function TimetablePanel({
  project: p,
  filter,
  onFilter,
  onChange,
  onGenerate,
  onCreateNew,
  onSelectTimetable,
  onOpenSaved,
  readOnly,
  issues,
  onError,
  initialSessionId,
}: {
  project: Project;
  filter: TimetableFilter;
  onFilter: (f: TimetableFilter) => void;
  onChange: (p: Project) => boolean;
  onGenerate: () => void;
  onCreateNew: () => void;
  onSelectTimetable: (id: string) => void;
  onOpenSaved: () => void;
  readOnly: boolean;
  issues: Issue[];
  onError: (s: string) => void;
  initialSessionId?: string;
}) {
  const [day, setDay] = useState(
      p.sessions.find((s) => s.id === initialSessionId)?.dayId ||
        p.settings.days[0] ||
        "Mon",
    ),
    [editing, setEditing] = useState<string | null>(initialSessionId || null),
    [dragging, setDragging] = useState<string | null>(null),
    [target, setTarget] = useState<string | null>(null),
    [moving, setMoving] = useState<string | null>(null),
    [breakMove, setBreakMove] = useState<{
      source: string;
      dayId: string;
      slotId: string;
    } | null>(null),
    [choice, setChoice] = useState<{
      source: string;
      ids: string[];
      to: Placement;
    } | null>(null);
  useEffect(() => {
    if (!initialSessionId) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-session="${CSS.escape(initialSessionId)}"]`,
        )
        ?.scrollIntoView({
          block: "center",
          inline: "center",
          behavior: "instant",
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialSessionId]);
  const sessions = selectSessions(p, filter),
    warned = new Set(issues.flatMap((i) => i.sessionIds));
  const activeDay = p.settings.days.includes(day) ? day : p.settings.days[0];
  const mergedBreakSlots = emptyBreakSlotIds(p, activeDay);
  function dropIntoBreak(
    e: React.DragEvent<HTMLTableCellElement>,
    slotId: string,
  ) {
    e.preventDefault();
    if (readOnly) return;
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rows = Array.from(
      e.currentTarget
        .closest("table")!
        .querySelectorAll<HTMLTableRowElement>("tbody tr[data-room-id]"),
    );
    const row = rows.find((row) => {
      const rect = row.getBoundingClientRect();
      return e.clientY >= rect.top && e.clientY < rect.bottom;
    });
    place(id, {
      dayId: activeDay,
      slotId,
      roomId: row?.dataset.roomId || p.rooms[0].id,
    });
  }
  const subject = (s: Session) =>
    p.subjects.find(
      (x) =>
        x.id ===
        p.teachingGroups.find((g) => g.id === s.teachingGroupId)?.subjectId,
    );
  function place(source: string, to: Placement) {
    const all = p.sessions.filter(
      (s) =>
        s.id !== source &&
        s.dayId === to.dayId &&
        s.roomId === to.roomId &&
        s.slotId === to.slotId,
    );
    if (all.length > 1) {
      setChoice({ source, ids: all.map((s) => s.id), to });
      return;
    }
    try {
      onChange(
        all.length
          ? swapSessions(p, source, all[0].id)
          : moveSession(p, source, to),
      );
      setMoving(null);
    } catch (e) {
      onError((e as Error).message);
    }
    setDragging(null);
    setTarget(null);
  }
  const visibleRooms = p.rooms;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UNIVERSITY SCHEDULE</span>
          <h1>
            University timetable{" "}
            <span className="term-label">{p.settings.term}</span>
          </h1>
          <p>
            View and edit classes across departments, semesters, rooms, and
            teaching days.
          </p>
        </div>
        <div className="filter-row timetable-heading-actions">
          <button className="btn secondary" onClick={onOpenSaved}>
            Saved timetables
          </button>
          {(p.sessions.length > 0 || !!p.savedTimetables?.length) && (
            <button
              className="btn secondary"
              disabled={readOnly}
              onClick={onCreateNew}
            >
              <Plus size={16} />
              Create new timetable
            </button>
          )}
          <button
            className="btn primary"
            disabled={readOnly || !p.offerings.length}
            onClick={onGenerate}
          >
            <Layers size={17} />
            Generate timetable
          </button>
        </div>
      </div>
      {(p.sessions.length > 0 || !!p.savedTimetables?.length) && (
        <div className="timetable-library panel">
          <label htmlFor="active-timetable">Active timetable</label>
          <select
            id="active-timetable"
            value={p.activeTimetableId || p.id}
            disabled={readOnly}
            onChange={(e) => onSelectTimetable(e.target.value)}
          >
            {timetableOptions(p).map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="small muted">
            Each timetable saves its own setup and classes.
          </span>
        </div>
      )}
      {!p.sessions.length && p.offerings.length > 0 && (
        <div className="notice" role="status">
          Setup is loaded. Generate a timetable, review it, then apply it to
          place classes in the grid.
        </div>
      )}
      <div className="stats-grid">
        <Stat
          icon={<CalendarDays size={21} />}
          color="navy"
          label="Scheduled classes"
          value={p.sessions.length}
          detail={`${p.settings.days.length} teaching days`}
        />
        <Stat
          icon={<Users size={21} />}
          color="purple"
          label="Teaching faculty"
          value={p.teachers.length}
          detail={`${p.subjects.length} unique subjects`}
        />
        <Stat
          icon={<Building2 size={21} />}
          color="teal"
          label="Available rooms"
          value={p.rooms.length}
          detail="Shared across departments"
        />
        <Stat
          icon={<TriangleAlert size={21} />}
          color={issues.length ? "red" : "green"}
          label="Clashes & issues"
          value={issues.length}
          detail={
            issues.length
              ? "Review in Clashes & Issues"
              : "Your schedule is looking clear"
          }
        />
      </div>
      <section className="panel timetable-panel">
        <div className="timetable-top">
          <div className="section-heading">
            <span className="small-icon">
              <CalendarDays size={19} />
            </span>
            <h2>Weekly schedule</h2>
            <span className="badge subtle">{sessions.length} classes</span>
          </div>
          <span className="small muted">
            {filter.departmentId || filter.semester
              ? "Filtered view"
              : "Full university view"}
          </span>
        </div>
        <div className="timetable-filters">
          <div className="filter-row">
            <span className="muted filter-label">
              <Filter size={15} /> Filter by
            </span>
            <select
              aria-label="Filter by department"
              value={filter.departmentId || ""}
              onChange={(e) =>
                onFilter({
                  ...filter,
                  departmentId: e.target.value || undefined,
                })
              }
            >
              <option value="">All departments</option>
              {p.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by semester"
              value={filter.semester || ""}
              onChange={(e) =>
                onFilter({ ...filter, semester: +e.target.value || undefined })
              }
            >
              <option value="">All semesters</option>
              {Array.from({ length: p.settings.semesterCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </select>
            {(filter.departmentId || filter.semester) && (
              <button className="btn text-btn" onClick={() => onFilter({})}>
                Clear
              </button>
            )}
          </div>
          <div className="legend">
            <span>
              <i className="legend-dot navy-dot" />
              Class
            </span>
            <span>
              <LockKeyhole size={12} />
              Locked
            </span>
            <span>
              <i className="legend-dot red-dot" />
              Warning
            </span>
          </div>
        </div>
        <div className="day-tabs" role="tablist" aria-label="Teaching day">
          {p.settings.days.map((d) => (
            <button
              role="tab"
              aria-selected={activeDay === d}
              className={activeDay === d ? "active" : ""}
              key={d}
              onClick={() => setDay(d)}
            >
              {
                (
                  {
                    Mon: "Monday",
                    Tue: "Tuesday",
                    Wed: "Wednesday",
                    Thu: "Thursday",
                    Fri: "Friday",
                    Sat: "Saturday",
                    Sun: "Sunday",
                  } as Record<string, string>
                )[d]
              }
              <span>{sessions.filter((s) => s.dayId === d).length}</span>
            </button>
          ))}
        </div>
        {moving && (
          <div className="notice flex-between">
            <span>
              Choose an empty cell to move this class, or an occupied cell to
              swap.
            </span>
            <button className="btn text-btn" onClick={() => setMoving(null)}>
              Cancel move
            </button>
          </div>
        )}
        {!p.rooms.length ? (
          <Empty
            title="A clear week starts here"
            description="Add departments, subjects, teachers and rooms, then generate your first university timetable."
          />
        ) : (
          <div className="timetable-scroll">
            <table className="timetable">
              <colgroup>
                <col style={{ width: 145 }} />
                {p.settings.slots.map((s) => (
                  <col
                    key={s.id}
                    style={{
                      minWidth: mergedBreakSlots.has(s.id) ? 85 : 190,
                      width: mergedBreakSlots.has(s.id) ? 85 : 210,
                    }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span className="room-header">ROOM / VENUE</span>
                    <span className="muted small">{activeDay}</span>
                  </th>
                  {p.settings.slots.map((slot) => (
                    <th
                      className={slot.isBreak ? "break-head" : ""}
                      key={slot.id}
                    >
                      <Clock3 size={12} />
                      <span>
                        {slot.start} – {slot.end}
                      </span>
                      <small>
                        {slot.isBreak ? "UNIVERSITY BREAK" : "TEACHING SLOT"}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRooms.map((room, roomIndex) => (
                  <tr key={room.id} data-room-id={room.id}>
                    <th>
                      <strong>{room.name}</strong>
                      <span>{room.type}</span>
                    </th>
                    {p.settings.slots.map((slot) => {
                      if (mergedBreakSlots.has(slot.id))
                        return roomIndex === 0 ? (
                          <td
                            key={slot.id}
                            rowSpan={visibleRooms.length}
                            data-break-slot={slot.id}
                            className={`break-cell merged-break-cell ${target === `break-${slot.id}` ? "drop-target" : ""}`}
                            onDragOver={(e) => {
                              if (!readOnly) {
                                e.preventDefault();
                                setTarget(`break-${slot.id}`);
                              }
                            }}
                            onDragLeave={() => setTarget(null)}
                            onDrop={(e) => dropIntoBreak(e, slot.id)}
                          >
                            <span className="break-label">Break</span>
                            <button
                              className="merged-break-target"
                              disabled={!moving || readOnly}
                              aria-label={`Move class into break ${slot.start} ${slot.end}`}
                              onClick={() =>
                                moving &&
                                setBreakMove({
                                  source: moving,
                                  slotId: slot.id,
                                  dayId: activeDay,
                                })
                              }
                            >
                              {moving && <small>Choose room</small>}
                            </button>
                          </td>
                        ) : null;
                      const to = {
                          dayId: activeDay,
                          slotId: slot.id,
                          roomId: room.id,
                        },
                        key = `${room.id}-${slot.id}`,
                        ss = sessions.filter(
                          (s) =>
                            s.roomId === room.id &&
                            s.dayId === activeDay &&
                            s.slotId === slot.id,
                        );
                      return (
                        <td
                          key={slot.id}
                          className={`${slot.isBreak ? "break-cell" : ""} ${target === key ? "drop-target" : ""} ${moving ? "move-mode" : ""}`}
                          onDragOver={(e) => {
                            if (!readOnly) {
                              e.preventDefault();
                              setTarget(key);
                            }
                          }}
                          onDragLeave={() => setTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData("text/plain");
                            if (id && !readOnly) place(id, to);
                          }}
                        >
                          <>
                            {ss.map((s) => {
                              const sub = subject(s),
                                color = subjectColor(sub?.code || ""),
                                warnings = issues.filter((i) =>
                                  i.sessionIds.includes(s.id),
                                );
                              return (
                                <button
                                  data-session={s.id}
                                  key={s.id}
                                  className={`class-card ${initialSessionId === s.id ? "inspected" : ""} ${warned.has(s.id) ? "has-warning" : ""} ${dragging === s.id ? "dragging" : ""}`}
                                  style={
                                    {
                                      "--card-color": color,
                                    } as React.CSSProperties
                                  }
                                  draggable={!readOnly && !s.locked}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", s.id);
                                    setDragging(s.id);
                                  }}
                                  onDragEnd={() => {
                                    setDragging(null);
                                    setTarget(null);
                                  }}
                                  onClick={() =>
                                    moving
                                      ? place(moving, to)
                                      : setEditing(s.id)
                                  }
                                  aria-label={`${sub?.name}, ${p.teachers.find((t) => t.id === s.teacherId)?.name}, ${groupLabel(p, s.teachingGroupId)}`}
                                  title={
                                    warnings.length
                                      ? warnings
                                          .map((i) => i.message)
                                          .join("\n")
                                      : "Click to edit · drag to move or swap"
                                  }
                                >
                                  <div className="class-card-top">
                                    <span>{sub?.code}</span>
                                    <div>
                                      {s.locked ? (
                                        <LockKeyhole size={13} />
                                      ) : (
                                        <GripVertical size={13} />
                                      )}{" "}
                                      {!!warnings.length && (
                                        <TriangleAlert size={14} />
                                      )}
                                    </div>
                                  </div>
                                  <strong>{sub?.name}</strong>
                                  <span className="class-groups">
                                    {groupLabel(p, s.teachingGroupId)}
                                  </span>
                                  <span className="class-teacher">
                                    {
                                      p.teachers.find(
                                        (t) => t.id === s.teacherId,
                                      )?.name
                                    }
                                  </span>
                                  {s.note && (
                                    <span className="class-note">{s.note}</span>
                                  )}
                                </button>
                              );
                            })}
                            {!ss.length && (
                              <button
                                className="empty-cell"
                                disabled={!moving || readOnly}
                                onClick={() => moving && place(moving, to)}
                                aria-label={`Move to ${room.name} ${activeDay} ${slot.start}`}
                              >
                                {moving ? (
                                  <ArrowUpRight size={20} />
                                ) : (
                                  <span>—</span>
                                )}
                              </button>
                            )}
                          </>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="timetable-footer">
          <span>
            <MousePointer2 size={14} /> Click a class to edit. Drag to move or
            swap.
          </span>
          <span>
            <span className="dot green-dot" /> Autosaved on this browser
          </span>
        </div>
      </section>
      <div className="bottom-notes">
        <div>
          <span className="avatar color-0">
            <LockKeyhole size={18} />
          </span>
          <div>
            <strong>Locked placements</strong>
            <p>Lock a class to preserve its place when regenerating.</p>
          </div>
        </div>
        <div>
          <span className="avatar color-1">
            <Layers size={18} />
          </span>
          <div>
            <strong>Combined teaching groups</strong>
            <p>Combined subjects stay connected across every filtered view.</p>
          </div>
        </div>
      </div>
      {editing && (
        <SessionEditor
          project={p}
          session={p.sessions.find((s) => s.id === editing)!}
          readOnly={readOnly}
          issues={issues.filter((i) => i.sessionIds.includes(editing))}
          onSave={onChange}
          onClose={() => setEditing(null)}
          onMove={() => {
            setMoving(editing);
            setEditing(null);
          }}
        />
      )}
      {choice && (
        <Modal title="Choose a class to swap" onClose={() => setChoice(null)}>
          <div className="modal-body">
            <p>
              More than one class occupies this cell. Choose the class to
              exchange places with.
            </p>
            {choice.ids.map((id) => {
              const s = p.sessions.find((s) => s.id === id)!;
              return (
                <button
                  className="choice-row"
                  key={id}
                  onClick={() => {
                    try {
                      onChange(swapSessions(p, choice.source, id));
                      setChoice(null);
                      setMoving(null);
                    } catch (e) {
                      onError((e as Error).message);
                    }
                  }}
                >
                  {subject(s)?.name}
                  <span>
                    {p.teachers.find((t) => t.id === s.teacherId)?.name}
                  </span>
                </button>
              );
            })}
            <button
              className="btn secondary"
              onClick={() => {
                try {
                  onChange(moveSession(p, choice.source, choice.to));
                  setChoice(null);
                  setMoving(null);
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              Move here without swapping (may create warnings)
            </button>
          </div>
        </Modal>
      )}
      {breakMove && (
        <Modal
          title="Choose a room for this break slot"
          onClose={() => setBreakMove(null)}
        >
          <div className="modal-body">
            <p className="muted small">Select the room to use for the class.</p>
            {p.rooms.map((room) => (
              <button
                className="choice-row"
                key={room.id}
                onClick={() => {
                  place(breakMove.source, {
                    roomId: room.id,
                    dayId: breakMove.dayId,
                    slotId: breakMove.slotId,
                  });
                  setBreakMove(null);
                }}
              >
                {room.name}
                <span>{room.type}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function Stat({
  icon,
  color,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="stat-card">
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <small>{detail}</small>
      </div>
      <span className={`stat-icon ${color}`}>{icon}</span>
    </article>
  );
}
function subjectColor(code: string) {
  const colors = [
    "#5664c7",
    "#13a291",
    "#bd7b28",
    "#9160b7",
    "#387cbc",
    "#c25e65",
  ];
  return colors[
    [...code].reduce((n, c) => n + c.charCodeAt(0), 0) % colors.length
  ];
}
function SessionEditor({
  project: p,
  session: s,
  readOnly,
  issues,
  onSave,
  onClose,
  onMove,
}: {
  project: Project;
  session: Session;
  readOnly: boolean;
  issues: Issue[];
  onSave: (p: Project) => boolean;
  onClose: () => void;
  onMove: () => void;
}) {
  const [value, set, clearDraft, draft] = useDraft(
    timetableDraftId(p) + "-session-" + s.id,
    s,
    p.revision,
    p.id + "-session-" + s.id + "-" + p.revision,
  );
  const [error, setError] = useState("");
  const group =
    p.teachingGroups.find((g) => g.id === value.teachingGroupId) ||
    p.teachingGroups.find((g) => g.id === s.teachingGroupId)!;
  const eligibleTeachers = p.teachers.filter((t) =>
    t.subjectIds.includes(group.subjectId),
  );
  return (
    <Modal title="Edit class" onClose={onClose}>
      <Form
        onClose={onClose}
        error={error}
        submit="Save class"
        onSubmit={(e) => {
          e.preventDefault();
          if (readOnly) return;
          if (s.locked) {
            setError("Unlock this class before editing it.");
            return;
          }
          if (group.id !== value.teachingGroupId) {
            setError(
              "Choose a current teaching group before saving this older draft.",
            );
            return;
          }
          if (!eligibleTeachers.some((t) => t.id === value.teacherId)) {
            setError(
              "Select an eligible teacher for this subject before saving.",
            );
            return;
          }
          const next = {
            ...p,
            sessions: p.sessions.map((x) => (x.id === s.id ? value : x)),
          };
          if (onSave(next)) {
            clearDraft();
            onClose();
          } else setError("Could not save this class");
        }}
      >
        <DraftNotice draft={draft} />
        <fieldset disabled={readOnly || s.locked} className="plain-fieldset">
          <Field label="Subject & teaching group">
            <select
              required
              value={
                p.teachingGroups.some((g) => g.id === value.teachingGroupId)
                  ? value.teachingGroupId
                  : ""
              }
              onChange={(e) => {
                const nextGroup = p.teachingGroups.find(
                  (g) => g.id === e.target.value,
                )!;
                const eligible = p.teachers.some(
                  (t) =>
                    t.id === value.teacherId &&
                    t.subjectIds.includes(nextGroup.subjectId),
                );
                set({
                  ...value,
                  teachingGroupId: nextGroup.id,
                  teacherId: eligible ? value.teacherId : "",
                });
              }}
            >
              <option value="" disabled>
                Select a current teaching group
              </option>
              {p.teachingGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {p.subjects.find((s) => s.id === g.subjectId)?.name} —{" "}
                  {groupLabel(p, g.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Teacher">
            <select
              required
              value={
                eligibleTeachers.some((t) => t.id === value.teacherId)
                  ? value.teacherId
                  : ""
              }
              onChange={(e) => set({ ...value, teacherId: e.target.value })}
            >
              <option value="" disabled>
                {eligibleTeachers.length
                  ? "Select an eligible teacher"
                  : "No eligible teachers. Update teacher details."}
              </option>
              {eligibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room">
            <select
              value={value.roomId}
              onChange={(e) => set({ ...value, roomId: e.target.value })}
            >
              {p.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.type}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Day">
              <select
                value={value.dayId}
                onChange={(e) => set({ ...value, dayId: e.target.value })}
              >
                {p.settings.days.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Time slot">
              <select
                value={value.slotId}
                onChange={(e) => set({ ...value, slotId: e.target.value })}
              >
                {p.settings.slots.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.start} – {t.end}
                    {t.isBreak ? " (Break)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Class note"
            hint="Optional display text. Notes do not change the configured slot timing."
          >
            <textarea
              rows={3}
              maxLength={4000}
              placeholder="e.g. 2-hour lab · Bring lab notebooks"
              value={value.note}
              onChange={(e) => set({ ...value, note: e.target.value })}
            />
          </Field>
        </fieldset>
        <div className="class-edit-actions">
          <button
            type="button"
            className={`btn ${s.locked ? "primary" : "secondary"}`}
            disabled={readOnly}
            onClick={() => {
              onSave({
                ...p,
                sessions: p.sessions.map((x) =>
                  x.id === s.id ? { ...x, locked: !x.locked } : x,
                ),
              });
              onClose();
            }}
          >
            <LockKeyhole size={16} />
            {s.locked ? "Unlock class" : "Lock class"}
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={readOnly || s.locked}
            onClick={onMove}
          >
            Move / swap
          </button>
        </div>
        {s.locked && (
          <p className="notice">
            This class is locked. Unlock it before editing or moving it.
          </p>
        )}
        {!!issues.length && (
          <div className="notice error">
            {issues.map((i) => (
              <p key={i.id}>{i.message}</p>
            ))}
          </div>
        )}
        <p className="small muted">
          Manual conflicts are allowed and will appear as warnings.
        </p>
      </Form>
    </Modal>
  );
}
