import { useState } from "react";
import { GripVertical } from "lucide-react";
import {
  type Project,
  type TimetableFilter,
  type Placement,
} from "../../domain/types";
import { remainingClasses, placeManualClass } from "../../domain/manual";
import { groupLabel, findIssues } from "../../domain/issues";
import { Modal, Form, Field } from "../../components/ui";

export function UnscheduledClasses({
  project: p,
  filter,
  readOnly,
  selected,
  onSelect,
}: {
  project: Project;
  filter: TimetableFilter;
  readOnly: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const pending = remainingClasses(p).filter((g) =>
    g.offeringIds.some((id) => {
      const o = p.offerings.find((o) => o.id === id);
      return (
        o &&
        (!filter.departmentId || o.departmentId === filter.departmentId) &&
        (!filter.semester || o.semester === filter.semester)
      );
    }),
  );
  if (!p.teachingGroups.length || !pending.length) return null;
  return (
    <section className="panel manual-class-tray">
      <div className="panel-toolbar">
        <strong>Unscheduled classes</strong>
        <span className="badge">
          {pending.reduce((n, g) => n + g.remaining, 0)} remaining
        </span>
      </div>
      <div className="manual-tray-body">
        <p className="small muted">
          Drag a class onto a room and time slot, or select it then click a
          cell. Choose an eligible teacher and review live clash warnings before
          placing it.
        </p>
        <div className="manual-tray-list">
          {pending.map((g) => (
            <button
              key={g.id}
              className={`pending-class ${selected === `pending:${g.id}` ? "selected" : ""}`}
              draggable={!readOnly}
              disabled={readOnly}
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", `pending:${g.id}`)
              }
              onClick={() => onSelect(`pending:${g.id}`)}
            >
              <GripVertical size={16} />
              <div>
                <strong>
                  {p.subjects.find((s) => s.id === g.subjectId)?.name}
                </strong>
                <small>{groupLabel(p, g.id)}</small>
                <small>
                  {g.remaining} left - {g.roomType}
                </small>
              </div>
            </button>
          ))}
        </div>
        {!pending.length && (
          <p className="small muted">
            All weekly classes in this view have been placed.
          </p>
        )}
      </div>
    </section>
  );
}

export function ManualClassPlacement({
  project: p,
  groupId,
  to,
  readOnly,
  onSave,
  onClose,
}: {
  project: Project;
  groupId: string;
  to: Placement;
  readOnly: boolean;
  onSave: (p: Project) => boolean;
  onClose: () => void;
}) {
  const group = p.teachingGroups.find((g) => g.id === groupId);
  const teachers = p.teachers.filter((t) =>
    t.subjectIds.includes(group?.subjectId || ""),
  );
  const [teacherId, setTeacherId] = useState(
    teachers.length === 1 ? teachers[0].id : "",
  );
  const [error, setError] = useState("");
  let warnings: ReturnType<typeof findIssues> = [];
  try {
    if (teacherId) {
      const preview = placeManualClass(p, groupId, teacherId, to);
      const id = preview.sessions[preview.sessions.length - 1].id;
      warnings = findIssues(preview).filter(
        (i) => i.kind !== "requirement" && i.sessionIds.includes(id),
      );
    }
  } catch {
    /* Validation is shown on submit if the setup changed. */
  }
  return (
    <Modal title="Place class" onClose={onClose}>
      <Form
        onClose={onClose}
        submit="Place class"
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          if (readOnly) {
            setError("Take over editing before placing a class.");
            return;
          }
          try {
            if (onSave(placeManualClass(p, groupId, teacherId, to))) onClose();
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        <h3>
          {p.subjects.find((s) => s.id === group?.subjectId)?.name || "Class"}
        </h3>
        <p className="small muted">{groupLabel(p, groupId)}</p>
        <p>
          {to.dayId} - {p.settings.slots.find((s) => s.id === to.slotId)?.start}{" "}
          - {p.rooms.find((r) => r.id === to.roomId)?.name}
        </p>
        <Field label="Teacher">
          <select
            required
            value={teacherId}
            disabled={readOnly}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="" disabled>
              {teachers.length
                ? "Select an eligible teacher"
                : "No eligible teachers. Update teacher details."}
            </option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <div
          aria-live="polite"
          className={`notice ${warnings.length ? "manual-clash-preview" : ""}`}
        >
          {!teacherId ? (
            "Select a teacher to check this placement."
          ) : warnings.length ? (
            <>
              <strong>{warnings.length} warnings for this placement</strong>
              {warnings.map((i) => (
                <p key={i.id}>{i.message}</p>
              ))}
              <p>
                You can place it anyway. Affected cells will be highlighted red.
              </p>
            </>
          ) : (
            "No conflicts detected for this placement."
          )}
        </div>
      </Form>
    </Modal>
  );
}
