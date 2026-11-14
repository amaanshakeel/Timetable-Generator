import { useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  Layers,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  type Project,
  type Teacher,
  type Room,
  type Offering,
  type Subject,
  type Department,
  uid,
  departmentSemesters,
} from "../../domain/types";
import { validateProject } from "../../domain/validation";
import {
  Modal,
  Field,
  Form,
  Empty,
  Confirm,
  useDraft,
  Toggle,
  DraftNotice,
} from "../../components/ui";
import { AvailabilityGrid } from "../../components/AvailabilityGrid";
type Kind = "departments" | "subjects" | "teachers" | "rooms";
interface Props {
  kind: Kind;
  project: Project;
  onChange: (p: Project) => boolean;
  readOnly: boolean;
  onError: (s: string) => void;
  initialOfferingId?: string;
}
const titles = {
  departments: "Departments",
  subjects: "Subjects & offerings",
  teachers: "Teachers",
  rooms: "Rooms",
};
const descriptions = {
  departments: "Manage the departments included in the university timetable.",
  subjects: "Enter subject requirements by semester and department.",
  teachers: "Manage eligible subjects and availability for each teacher.",
  rooms: "Manage room types and weekly availability.",
};
export function DataPanel({
  kind,
  project: p,
  onChange,
  readOnly,
  onError,
  initialOfferingId,
}: Props) {
  const [search, setSearch] = useState(""),
    [edit, setEdit] = useState<string | null>(initialOfferingId || null),
    [remove, setRemove] = useState<string | null>(null),
    [semester, setSemester] = useState(
      p.offerings.find((o) => o.id === initialOfferingId)?.semester || 1,
    ),
    [department, setDepartment] = useState(
      p.offerings.find((o) => o.id === initialOfferingId)?.departmentId || "",
    );
  const preferenceKey = "uor-department-semesters-" + p.id;
  const [lastSemesters, setLastSemesters] = useState<number[]>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(preferenceKey) || "null",
      );
      if (Array.isArray(saved)) {
        const valid = saved.filter(
          (n): n is number =>
            Number.isInteger(n) && n >= 1 && n <= p.settings.semesterCount,
        );
        if (valid.length) return [...new Set(valid)];
      }
    } catch {
      /* A preference must never prevent opening a workspace. */
    }
    return [1];
  });
  const availableDepartments = p.departments.filter(
    (d) => semester === 0 || departmentSemesters(p, d).includes(semester),
  );
  const matches = (text: string) =>
    text.toLowerCase().includes(search.toLowerCase());
  const subject = (id: string) => p.subjects.find((s) => s.id === id);
  function save(next: Project) {
    const valid = validateProject(next);
    if (!valid.ok) return valid.error;
    if (onChange(valid.value)) {
      setEdit(null);
      return "";
    }
    return "Could not save changes";
  }
  function deleteRecord() {
    if (!remove) return;
    let next = structuredClone(p);
    let removedOfferings: string[] = [];
    if (kind === "departments") {
      removedOfferings = p.offerings
        .filter((o) => o.departmentId === remove)
        .map((o) => o.id);
      next.departments = next.departments.filter((d) => d.id !== remove);
    }
    if (kind === "subjects") removedOfferings = [remove];
    const affectedGroups = p.teachingGroups
      .filter((g) => g.offeringIds.some((id) => removedOfferings.includes(id)))
      .map((g) => g.id);
    const affected = p.sessions.filter(
      (s) =>
        affectedGroups.includes(s.teachingGroupId) ||
        (kind === "teachers" && s.teacherId === remove) ||
        (kind === "rooms" && s.roomId === remove),
    );
    if (affected.some((s) => s.locked)) {
      onError("Unlock affected classes before removing this record.");
      setRemove(null);
      return;
    }
    next.sessions = next.sessions.filter(
      (s) => !affected.some((a) => a.id === s.id),
    );
    next.teachingGroups = next.teachingGroups.filter(
      (g) => !affectedGroups.includes(g.id),
    );
    next.offerings = next.offerings.filter(
      (o) => !removedOfferings.includes(o.id),
    );
    if (kind === "teachers")
      next.teachers = next.teachers.filter((t) => t.id !== remove);
    if (kind === "rooms")
      next.rooms = next.rooms.filter((r) => r.id !== remove);
    onChange(next);
    setRemove(null);
  }
  const addLabel =
    kind === "subjects"
      ? "Add subject"
      : kind === "departments"
        ? "Add department"
        : kind === "teachers"
          ? "Add teacher"
          : "Add room";
  const controls = (id: string) => (
    <div className="row-actions">
      <button
        className="icon-btn"
        disabled={readOnly}
        aria-label="Edit record"
        onClick={() => setEdit(id)}
      >
        <Pencil size={15} />
      </button>
      <button
        className="icon-btn danger"
        disabled={readOnly}
        aria-label="Remove record"
        onClick={() => setRemove(id)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  const offerings = p.offerings.filter(
    (o) =>
      (semester === 0 || o.semester === semester) &&
      (!department || o.departmentId === department) &&
      matches(
        `${subject(o.subjectId)?.name} ${subject(o.subjectId)?.code} ${p.departments.find((d) => d.id === o.departmentId)?.code}`,
      ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UNIVERSITY DATA</span>
          <h1>{titles[kind]}</h1>
          <p>{descriptions[kind]}</p>
        </div>
        <button
          disabled={readOnly}
          className="btn primary"
          onClick={() => setEdit("new")}
        >
          <Plus size={17} />
          {addLabel}
        </button>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label={`Search ${kind}`}
              placeholder={`Search ${kind}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {kind === "subjects" && (
            <div className="filter-row">
              <select
                aria-label="Offering semester"
                value={semester}
                onChange={(e) => {
                  const nextSemester = +e.target.value;
                  setSemester(nextSemester);
                  if (
                    !p.departments.some(
                      (d) =>
                        d.id === department &&
                        (nextSemester === 0 ||
                          departmentSemesters(p, d).includes(nextSemester)),
                    )
                  )
                    setDepartment("");
                }}
              >
                <option value={0}>All semesters</option>
                {Array.from({ length: p.settings.semesterCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
              <select
                aria-label="Offering department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All departments</option>
                {availableDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="count-label">
            {kind === "subjects"
              ? `${offerings.length} of ${p.offerings.length}`
              : p[kind].length}{" "}
            records
          </span>
        </div>
        {kind === "departments" && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Active semesters</th>
                  <th>Subject offerings</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.departments
                  .filter((d) => matches(d.name + d.code))
                  .map((d, i) => (
                    <tr key={d.id}>
                      <td>
                        <div className="identity">
                          <span className={`avatar color-${i % 4}`}>
                            <GraduationCap size={18} />
                          </span>
                          <strong>{d.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge">{d.code}</span>
                      </td>
                      <td>
                        {departmentSemesters(p, d)
                          .map((n) => `Semester ${n}`)
                          .join(", ") || "No active semesters"}
                      </td>
                      <td>
                        {
                          p.offerings.filter((o) => o.departmentId === d.id)
                            .length
                        }
                      </td>
                      <td>{controls(d.id)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {kind === "subjects" && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Weekly classes</th>
                  <th>Room type</th>
                  <th>Combining</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{subject(o.subjectId)?.name}</strong>
                      <small className="block muted">
                        {subject(o.subjectId)?.code}
                      </small>
                    </td>
                    <td>
                      <span className="badge">
                        {
                          p.departments.find((d) => d.id === o.departmentId)
                            ?.code
                        }{" "}
                        · Sem {o.semester}
                      </span>
                    </td>
                    <td>{o.weeklyClasses} classes</td>
                    <td>{o.roomType}</td>
                    <td>
                      <span
                        className={`status-pill ${subject(o.subjectId)?.combine ? "green" : ""}`}
                      >
                        {subject(o.subjectId)?.combine ? "Allowed" : "Separate"}
                      </span>
                    </td>
                    <td>{controls(o.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {kind === "teachers" && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Eligible subjects</th>
                  <th>Availability</th>
                  <th>Weekly workload</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.teachers
                  .filter((t) =>
                    matches(
                      t.name +
                        t.subjectIds.map((id) => subject(id)?.name).join(" "),
                    ),
                  )
                  .map((t, i) => (
                    <tr key={t.id}>
                      <td>
                        <div className="identity">
                          <span className={`avatar color-${i % 4}`}>
                            {t.name
                              .split(" ")
                              .filter((x) => !["Dr.", "Mr.", "Ms."].includes(x))
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <strong>{t.name}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="tags">
                          {t.subjectIds.map((id) => (
                            <span className="badge" key={id}>
                              {subject(id)?.code}
                            </span>
                          ))}
                          {!t.subjectIds.length && (
                            <span className="muted">Not assigned</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${t.availability === null ? "green" : ""}`}
                        >
                          {t.availability === null
                            ? "All teaching slots"
                            : `${t.availability.length} available slots`}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {
                            p.sessions.filter((s) => s.teacherId === t.id)
                              .length
                          }
                        </strong>{" "}
                        classes / week
                      </td>
                      <td>{controls(t.id)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {kind === "rooms" && (
          <div className="room-grid">
            {p.rooms
              .filter((r) => matches(r.name + r.type))
              .map((r, i) => (
                <article className="room-card" key={r.id}>
                  <div className="flex-between">
                    <span className={`avatar color-${i % 4}`}>
                      <Building2 size={21} />
                    </span>
                    {controls(r.id)}
                  </div>
                  <h3>{r.name}</h3>
                  <p>{r.type}</p>
                  <div className="room-card-foot">
                    <span className="dot green-dot" />
                    {r.availability === null
                      ? "Available all week"
                      : `${r.availability.length} available slots`}
                  </div>
                </article>
              ))}
          </div>
        )}
        {(kind === "subjects" ? !offerings.length : !p[kind].length) && (
          <Empty
            title={`No ${kind === "subjects" ? "subject offerings" : kind} here yet`}
            description={
              kind === "subjects"
                ? "Select a semester and add the subjects taught by each department."
                : "Add your first record to start planning."
            }
            action={
              <button
                className="btn secondary"
                disabled={readOnly}
                onClick={() => setEdit("new")}
              >
                <Plus size={16} />
                {addLabel}
              </button>
            }
          />
        )}
      </div>
      {kind === "subjects" && (
        <section className="panel shared-panel">
          <div className="section-heading">
            <div className="identity">
              <span className="avatar color-1">
                <Layers size={20} />
              </span>
              <div>
                <h2>Shared subjects</h2>
                <p>
                  Automatically detected across departments and semesters. You
                  decide what can combine.
                </p>
              </div>
            </div>
          </div>
          {p.subjects
            .filter(
              (s) => p.offerings.filter((o) => o.subjectId === s.id).length > 1,
            )
            .map((s) => {
              const count = p.offerings.filter(
                (o) => o.subjectId === s.id,
              ).length;
              return (
                <div className="shared-row" key={s.id}>
                  <div>
                    <strong>{s.name}</strong>
                    <p>
                      {s.code} <span className="separator">·</span> {count}{" "}
                      department-semester groups
                    </p>
                  </div>
                  <div className="filter-row">
                    <label className="small">
                      Maximum groups{" "}
                      <input
                        aria-label={`Maximum groups for ${s.code}`}
                        className="number-small"
                        type="number"
                        min="1"
                        max="100"
                        value={s.maxCombine || p.settings.maxCombine}
                        disabled={readOnly}
                        onChange={(e) => {
                          if (+e.target.value > 0)
                            onChange({
                              ...p,
                              subjects: p.subjects.map((x) =>
                                x.id === s.id
                                  ? { ...x, maxCombine: +e.target.value }
                                  : x,
                              ),
                            });
                        }}
                      />
                    </label>
                    <Toggle
                      label="Allow combined classes"
                      checked={s.combine}
                      onChange={(combine) => {
                        if (!readOnly)
                          onChange({
                            ...p,
                            subjects: p.subjects.map((x) =>
                              x.id === s.id ? { ...x, combine } : x,
                            ),
                          });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          {!p.subjects.some(
            (s) => p.offerings.filter((o) => o.subjectId === s.id).length > 1,
          ) && (
            <p className="muted">
              Subjects with the same university-wide code will appear here when
              used by more than one group.
            </p>
          )}
        </section>
      )}
      {edit && kind === "departments" && (
        <DepartmentEditor
          projectId={p.id}
          revision={p.revision}
          semesterCount={p.settings.semesterCount}
          defaultSemesters={lastSemesters}
          value={p.departments.find((d) => d.id === edit)}
          onClose={() => setEdit(null)}
          onSave={(value) => {
            const error = save({
              ...p,
              departments:
                edit === "new"
                  ? [...p.departments, value]
                  : p.departments.map((d) => (d.id === edit ? value : d)),
            });
            if (!error && value.semesters) {
              setLastSemesters(value.semesters);
              try {
                localStorage.setItem(
                  preferenceKey,
                  JSON.stringify(value.semesters),
                );
              } catch {
                /* Keep the selection in memory when storage is unavailable. */
              }
            }
            return error;
          }}
        />
      )}
      {edit && kind === "subjects" && (
        <OfferingEditor
          project={p}
          value={p.offerings.find((o) => o.id === edit)}
          semester={
            semester ||
            p.departments.find((d) => d.id === department)?.semesters?.[0] ||
            1
          }
          department={department}
          onClose={() => setEdit(null)}
          onSave={save}
        />
      )}
      {edit && (kind === "teachers" || kind === "rooms") && (
        <ResourceEditor
          kind={kind}
          project={p}
          value={
            kind === "teachers"
              ? p.teachers.find((t) => t.id === edit)
              : p.rooms.find((r) => r.id === edit)
          }
          onClose={() => setEdit(null)}
          onSave={(value) =>
            save({
              ...p,
              [kind]:
                edit === "new"
                  ? [...p[kind], value]
                  : p[kind].map((x) => (x.id === edit ? value : x)),
            })
          }
        />
      )}
      {remove && (
        <Confirm
          title="Remove this record?"
          action="Remove record"
          onClose={() => setRemove(null)}
          onConfirm={deleteRecord}
        >
          <p>
            Any affected scheduled classes and teaching groups will also be
            removed. Locked classes must be unlocked first. You can undo this
            change.
          </p>
        </Confirm>
      )}
    </>
  );
}
function DepartmentEditor({
  projectId,
  revision,
  semesterCount,
  defaultSemesters,
  value,
  onSave,
  onClose,
}: {
  projectId: string;
  revision: number;
  semesterCount: number;
  defaultSemesters: number[];
  value?: Department;
  onSave: (v: Department) => string;
  onClose: () => void;
}) {
  const [v, set, clear, draft] = useDraft(
    projectId + "-department-" + (value?.id || "new"),
    {
      ...(value || { id: uid(), name: "", code: "" }),
      semesters: value
        ? (value.semesters ??
          Array.from({ length: semesterCount }, (_, i) => i + 1))
        : defaultSemesters,
    },
    revision,
  );
  // Drafts created before semester membership was added may omit this field.
  const selectedSemesters =
    v.semesters ??
    (value
      ? (value.semesters ??
        Array.from({ length: semesterCount }, (_, i) => i + 1))
      : defaultSemesters);
  const [error, setError] = useState("");
  return (
    <Modal
      title={value ? "Edit department" : "Add department"}
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          if (!selectedSemesters.length) {
            setError("Select at least one semester for this department.");
            return;
          }
          const error = onSave({ ...v, semesters: selectedSemesters });
          setError(error);
          if (!error) clear();
        }}
      >
        <Field label="Department name">
          <input
            required
            value={v.name}
            onChange={(e) => set({ ...v, name: e.target.value })}
            placeholder="Computer Science"
          />
        </Field>
        <fieldset className="department-semesters">
          <legend>Semesters</legend>
          <p className="small muted">
            Select every semester this department belongs to. Your selection is
            reused for the next department.
          </p>
          <div className="semester-options">
            {Array.from({ length: semesterCount }, (_, i) => i + 1).map((n) => (
              <label key={n} className="picker-option">
                <input
                  type="checkbox"
                  checked={selectedSemesters.includes(n)}
                  onChange={(e) =>
                    set({
                      ...v,
                      semesters: e.target.checked
                        ? [...selectedSemesters, n].sort((a, b) => a - b)
                        : selectedSemesters.filter((s) => s !== n),
                    })
                  }
                />
                <span>Semester {n}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <DraftNotice draft={draft} />
        <Field label="Department code">
          <input
            required
            value={v.code}
            onChange={(e) => set({ ...v, code: e.target.value.toUpperCase() })}
            placeholder="CS"
          />
        </Field>
      </Form>
    </Modal>
  );
}
function OfferingEditor({
  project: p,
  value,
  semester,
  department,
  onSave,
  onClose,
}: {
  project: Project;
  value?: Offering;
  semester: number;
  department: string;
  onSave: (v: Project) => string;
  onClose: () => void;
}) {
  const existing = p.subjects.find((s) => s.id === value?.subjectId);
  const [v, set, clear, draft] = useDraft(
    p.id + "-offering-" + (value?.id || "new"),
    {
      id: value?.id || uid(),
      subjectId: value?.subjectId || "",
      departmentId:
        value?.departmentId ||
        p.departments.find(
          (d) =>
            d.id === department && departmentSemesters(p, d).includes(semester),
        )?.id ||
        p.departments.find((d) => departmentSemesters(p, d).includes(semester))
          ?.id ||
        "",
      semester: value?.semester || semester,
      weeklyClasses: value?.weeklyClasses || 2,
      roomType: value?.roomType || p.settings.roomTypes[0],
      code: existing?.code || "",
      name: existing?.name || "",
    },
    p.revision,
  );
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const match = p.subjects.find(
      (s) => s.code.toLowerCase() === v.code.trim().toLowerCase(),
    );
    const sub: Subject = match
      ? { ...match, name: v.name.trim() }
      : {
          id: uid(),
          code: v.code.trim().toUpperCase(),
          name: v.name.trim(),
          combine: false,
        };
    const o: Offering = {
      id: v.id,
      subjectId: sub.id,
      departmentId: v.departmentId,
      semester: v.semester,
      weeklyClasses: v.weeklyClasses,
      roomType: v.roomType,
    };
    const structural =
      !!value &&
      (
        [
          "subjectId",
          "departmentId",
          "semester",
          "weeklyClasses",
          "roomType",
        ] as const
      ).some((key) => value[key] !== o[key]);
    const affectedGroups = p.teachingGroups.filter(
      (g) => value && g.offeringIds.includes(value.id),
    );
    const affected = p.sessions.filter((s) =>
      affectedGroups.some((g) => g.id === s.teachingGroupId),
    );
    if (
      structural &&
      p.sessions.some(
        (s) =>
          s.locked &&
          p.teachingGroups
            .find((g) => g.id === s.teachingGroupId)
            ?.offeringIds.includes(value.id),
      )
    ) {
      setError(
        "Unlock the affected classes before changing their subject offering.",
      );
      return;
    }
    let next = {
      ...p,
      subjects: match
        ? p.subjects.map((s) => (s.id === sub.id ? sub : s))
        : [...p.subjects, sub],
      offerings: value
        ? p.offerings.map((x) => (x.id === value.id ? o : x))
        : [...p.offerings, o],
    };
    if (value && structural) {
      next = {
        ...next,
        teachingGroups: next.teachingGroups
          .map((g) =>
            g.offeringIds.includes(value.id)
              ? {
                  ...g,
                  offeringIds: g.offeringIds.filter((id) => id !== value.id),
                }
              : g,
          )
          .filter((g) => g.offeringIds.length > 0),
      };
      next = {
        ...next,
        sessions: next.sessions.filter((s) =>
          next.teachingGroups.some((g) => g.id === s.teachingGroupId),
        ),
      };
    }
    if (structural && affectedGroups.length) {
      const valid = validateProject(next);
      if (!valid.ok) {
        setError(valid.error);
        return;
      }
      setPending({
        project: valid.value,
        affected,
        changes: (
          [
            "subjectId",
            "departmentId",
            "semester",
            "weeklyClasses",
            "roomType",
          ] as const
        )
          .filter((key) => value![key] !== o[key])
          .map((key) => `${key}: ${value![key]} → ${o[key]}`),
      });
      return;
    }
    const err = onSave(next);
    setError(err);
    if (!err) clear();
  }
  const [pending, setPending] = useState<{
    project: Project;
    affected: Project["sessions"];
    changes: string[];
  } | null>(null);
  if (pending)
    return (
      <Modal title="Review subject offering changes" onClose={onClose}>
        <Form
          submit="Apply reviewed changes"
          error={error}
          onClose={() => setPending(null)}
          onSubmit={(e) => {
            e.preventDefault();
            const error = onSave(pending.project);
            setError(error);
            if (!error) clear();
          }}
        >
          <h3>Requirement changes</h3>
          {pending.changes.map((c) => (
            <p className="small" key={c}>
              {c}
            </p>
          ))}
          <h3>Affected scheduled classes ({pending.affected.length})</h3>
          <p className="small muted">
            This offering will be detached from its existing teaching groups.
            Empty groups and their classes are removed; classes attended by
            other groups remain. Notes on removed classes will be kept in the
            recovery snapshot.
          </p>
          <div className="changes-list">
            {pending.affected.map((s) => (
              <p key={s.id}>
                {s.dayId} ·{" "}
                {p.settings.slots.find((t) => t.id === s.slotId)?.start} ·{" "}
                {p.rooms.find((r) => r.id === s.roomId)?.name}
                {s.note ? ` · Note: ${s.note}` : ""}
              </p>
            ))}
          </div>
          <p className="notice">
            Apply only after reviewing. A recovery snapshot is saved
            automatically, and you can also undo.
          </p>
        </Form>
      </Modal>
    );
  return (
    <Modal
      title={value ? "Edit subject offering" : "Add subject"}
      onClose={onClose}
    >
      <Form onSubmit={submit} onClose={onClose} error={error}>
        <DraftNotice draft={draft} />
        <div className="form-grid">
          <Field label="Semester">
            <select
              value={v.semester}
              onChange={(e) => {
                const nextSemester = +e.target.value;
                const valid = p.departments.some(
                  (d) =>
                    d.id === v.departmentId &&
                    departmentSemesters(p, d).includes(nextSemester),
                );
                set({
                  ...v,
                  semester: nextSemester,
                  departmentId: valid ? v.departmentId : "",
                });
              }}
            >
              {Array.from({ length: p.settings.semesterCount }, (_, i) => (
                <option value={i + 1} key={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              required
              value={v.departmentId}
              onChange={(e) => set({ ...v, departmentId: e.target.value })}
            >
              <option value="" disabled>
                Select department
              </option>
              {p.departments
                .filter((d) => departmentSemesters(p, d).includes(v.semester))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field
          label="University-wide subject code"
          hint="Choose an existing code to reuse its subject."
        >
          <input
            required
            list="catalog-codes"
            value={v.code}
            placeholder="ENG-101"
            onChange={(e) => {
              const match = p.subjects.find(
                (s) => s.code.toLowerCase() === e.target.value.toLowerCase(),
              );
              set({ ...v, code: e.target.value, name: match?.name || v.name });
            }}
          />
          <datalist id="catalog-codes">
            {p.subjects.map((s) => (
              <option key={s.id} value={s.code}>
                {s.name}
              </option>
            ))}
          </datalist>
        </Field>
        <Field
          label="Subject name"
          hint="A name correction updates this catalog subject wherever its code is used."
        >
          <input
            required
            value={v.name}
            onChange={(e) => set({ ...v, name: e.target.value })}
            placeholder="Functional English"
          />
        </Field>
        <div className="form-grid">
          <Field label="Classes per week">
            <input
              type="number"
              min="1"
              max="100"
              required
              value={v.weeklyClasses}
              onChange={(e) => set({ ...v, weeklyClasses: +e.target.value })}
            />
          </Field>
          <Field label="Required room type">
            <select
              value={v.roomType}
              onChange={(e) => set({ ...v, roomType: e.target.value })}
            >
              {p.settings.roomTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        {value && (
          <p className="notice">
            Changing an offering detaches it from its current teaching group.
            Regenerate afterward to apply its new requirements.
          </p>
        )}
        {!p.departments.length && (
          <p className="notice">
            Add a department before entering its subjects.
          </p>
        )}
      </Form>
    </Modal>
  );
}
function ResourceEditor({
  kind,
  project: p,
  value,
  onSave,
  onClose,
}: {
  kind: "teachers" | "rooms";
  project: Project;
  value?: Teacher | Room;
  onSave: (v: Teacher | Room) => string;
  onClose: () => void;
}) {
  const isTeacher = kind === "teachers";
  const [v, set, clear, draft] = useDraft<Teacher & { type: string }>(
    p.id + "-resource-" + kind + "-" + (value?.id || "new"),
    {
      id: value?.id || uid(),
      name: value?.name || "",
      subjectIds: value && "subjectIds" in value ? value.subjectIds : [],
      type: value && "type" in value ? value.type : p.settings.roomTypes[0],
      availability: value?.availability ?? null,
    },
    p.revision,
  );
  const [search, setSearch] = useState(""),
    [error, setError] = useState("");
  const seen = new Set<string>();
  const categories = p.offerings.reduce<Record<string, Subject[]>>((acc, o) => {
    const s = p.subjects.find((s) => s.id === o.subjectId)!;
    const dept = p.departments.find((d) => d.id === o.departmentId)!;
    const key = `${dept.code} — Semester ${o.semester}`;
    if (
      `${s.name} ${s.code} ${key}`.toLowerCase().includes(search.toLowerCase())
    ) {
      acc[key] ||= [];
      if (!acc[key].some((x) => x.id === s.id)) acc[key].push(s);
    }
    seen.add(s.id);
    return acc;
  }, {});
  const extra = p.subjects.filter(
    (s) =>
      !seen.has(s.id) &&
      `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (extra.length) categories["Other catalog subjects"] = extra;
  return (
    <Modal
      title={
        value
          ? `Edit ${isTeacher ? "teacher" : "room"}`
          : `Add ${isTeacher ? "teacher" : "room"}`
      }
      onClose={onClose}
      wide
    >
      <Form
        onClose={onClose}
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          const record: Teacher | Room = isTeacher
            ? {
                id: v.id,
                name: v.name,
                subjectIds: v.subjectIds,
                availability: v.availability,
              }
            : {
                id: v.id,
                name: v.name,
                type: v.type,
                availability: v.availability,
              };
          const err = onSave(record);
          setError(err);
          if (!err) clear();
        }}
      >
        <Field label={isTeacher ? "Teacher name" : "Room name"}>
          <input
            required
            value={v.name}
            onChange={(e) => set({ ...v, name: e.target.value })}
            placeholder={isTeacher ? "Dr. Ayesha Khan" : "CR-01"}
          />
        </Field>
        <DraftNotice draft={draft} />
        {isTeacher ? (
          <>
            <div className="field">
              <span>
                Eligible subjects{" "}
                <small className="muted">
                  ({v.subjectIds.length} selected)
                </small>
              </span>
              <div className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search eligible subjects"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subject, code, department, or semester"
                />
              </div>
              <div className="subject-picker">
                {Object.entries(categories)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, subjects]) => (
                    <div key={category}>
                      <h4>{category}</h4>
                      {subjects.map((s) => (
                        <label className="picker-option" key={s.id}>
                          <input
                            type="checkbox"
                            checked={v.subjectIds.includes(s.id)}
                            onChange={(e) =>
                              set({
                                ...v,
                                subjectIds: e.target.checked
                                  ? [...new Set([...v.subjectIds, s.id])]
                                  : v.subjectIds.filter((id) => id !== s.id),
                              })
                            }
                          />
                          <span>
                            {s.name}
                            <small>{s.code}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                {!Object.keys(categories).length && (
                  <p className="muted">
                    Add subject offerings first, or try another search.
                  </p>
                )}
              </div>
              <small className="muted">
                Selecting a shared subject makes this teacher eligible across
                its departments and semesters.
              </small>
            </div>
          </>
        ) : (
          <Field label="Room type">
            <select
              value={v.type}
              onChange={(e) => set({ ...v, type: e.target.value })}
            >
              {p.settings.roomTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}
        <h3 className="form-section-title">Availability</h3>
        <AvailabilityGrid
          settings={p.settings}
          value={v.availability}
          onChange={(availability) => set({ ...v, availability })}
        />
      </Form>
    </Modal>
  );
}
