import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Clock3,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";
import { type Project, uid } from "../../domain/types";
import { validateProject } from "../../domain/validation";
import { Field, useDraft, Confirm, DraftNotice } from "../../components/ui";
export function SettingsPanel({
  project: p,
  onChange,
  readOnly,
  onError,
  onLoadSample,
  onImport,
  onReset,
  onRestore,
}: {
  project: Project;
  onChange: (p: Project) => boolean;
  readOnly: boolean;
  onError: (e: string) => void;
  onLoadSample: () => void;
  onImport: () => void;
  onReset: () => void;
  onRestore: () => void;
}) {
  const [s, set, clear, draft] = useDraft(
      p.id + "-settings",
      p.settings,
      p.revision,
    ),
    [pending, setPending] = useState<Project | null>(null),
    [newType, setNewType] = useState(""),
    [saved, setSaved] = useState(false);
  function prepare() {
    let next = structuredClone(p);
    next.settings = s;
    next.departments = next.departments.map((d) => ({
      ...d,
      ...(d.semesters
        ? { semesters: d.semesters.filter((n) => n <= s.semesterCount) }
        : {}),
    }));
    const removedOfferings = p.offerings
      .filter(
        (o) =>
          o.semester > s.semesterCount || !s.roomTypes.includes(o.roomType),
      )
      .map((o) => o.id);
    const affectedGroups = p.teachingGroups
      .filter(
        (g) =>
          g.offeringIds.some((id) => removedOfferings.includes(id)) ||
          !s.roomTypes.includes(g.roomType),
      )
      .map((g) => g.id);
    const removedRooms = p.rooms
      .filter((r) => !s.roomTypes.includes(r.type))
      .map((r) => r.id);
    const affected = p.sessions.filter(
      (c) =>
        affectedGroups.includes(c.teachingGroupId) ||
        removedRooms.includes(c.roomId) ||
        !s.days.includes(c.dayId) ||
        !s.slots.some((t) => t.id === c.slotId) ||
        p.settings.slots.some(
          (old) =>
            old.id === c.slotId &&
            s.slots.some(
              (n) =>
                n.id === old.id &&
                (n.start !== old.start ||
                  n.end !== old.end ||
                  n.isBreak !== old.isBreak),
            ),
        ),
    );
    if (affected.some((c) => c.locked)) {
      onError(
        "Unlock affected classes before changing their days, slots or requirements.",
      );
      return;
    }
    next.offerings = next.offerings.filter(
      (o) => !removedOfferings.includes(o.id),
    );
    next.teachingGroups = next.teachingGroups.filter(
      (g) => !affectedGroups.includes(g.id),
    );
    next.sessions = next.sessions.filter(
      (c) => !affected.some((x) => x.id === c.id),
    );
    const keys = new Set(
      s.days.flatMap((d) => s.slots.map((t) => `${d}|${t.id}`)),
    );
    next.teachers = next.teachers.map((t) => ({
      ...t,
      availability: t.availability?.filter((k) => keys.has(k)) ?? null,
    }));
    next.rooms = next.rooms
      .filter((r) => !removedRooms.includes(r.id))
      .map((r) => ({
        ...r,
        availability: r.availability?.filter((k) => keys.has(k)) ?? null,
      }));
    const valid = validateProject(next);
    if (!valid.ok) {
      onError(valid.error);
      return;
    }
    if (affected.length || removedOfferings.length || removedRooms.length)
      setPending(next);
    else apply(next);
  }
  function apply(next: Project) {
    if (onChange(next)) {
      clear();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    }
    setPending(null);
  }
  return (
    <>
      <DraftNotice draft={draft} />
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKSPACE CONFIGURATION</span>
          <h1>University settings</h1>
          <p>Configure the teaching week and university scheduling rules.</p>
        </div>
        <button disabled={readOnly} className="btn primary" onClick={prepare}>
          <Save size={17} />
          {saved ? "Settings saved" : "Save settings"}
        </button>
      </div>
      <fieldset disabled={readOnly} className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section">
            <div className="section-heading">
              <span className="avatar color-0">
                <SlidersHorizontal size={20} />
              </span>
              <div>
                <h2>General information</h2>
                <p>
                  The details that appear across your workspace and exports.
                </p>
              </div>
            </div>
            <Field label="University name">
              <input
                value={s.university}
                onChange={(e) => set({ ...s, university: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Academic term">
                <input
                  value={s.term}
                  onChange={(e) => set({ ...s, term: e.target.value })}
                />
              </Field>
              <Field label="Number of semesters">
                <select
                  value={s.semesterCount}
                  onChange={(e) =>
                    set({ ...s, semesterCount: +e.target.value })
                  }
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} semesters
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
          <section className="panel settings-section">
            <div className="section-heading">
              <span className="avatar color-1">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2>Teaching days</h2>
                <p>Choose the days your university holds classes.</p>
              </div>
            </div>
            <div className="day-picker">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <button
                  type="button"
                  aria-pressed={s.days.includes(d)}
                  className={s.days.includes(d) ? "selected" : ""}
                  key={d}
                  onClick={() =>
                    set({
                      ...s,
                      days: s.days.includes(d)
                        ? s.days.filter((x) => x !== d)
                        : [
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun",
                          ].filter((x) => [...s.days, d].includes(x)),
                    })
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </section>
          <section className="panel settings-section">
            <div className="section-heading">
              <span className="avatar color-2">
                <Clock3 size={20} />
              </span>
              <div>
                <h2>Weekly time slots</h2>
                <p>These slots repeat across every teaching day.</p>
              </div>
            </div>
            <div className="slot-head">
              <span>START TIME</span>
              <span>END TIME</span>
              <span>BREAK</span>
              <span />
            </div>
            {s.slots.map((slot, i) => (
              <div className="slot-row" key={slot.id}>
                <input
                  aria-label={`Slot ${i + 1} start`}
                  type="time"
                  value={slot.start}
                  onChange={(e) =>
                    set({
                      ...s,
                      slots: s.slots.map((x) =>
                        x.id === slot.id ? { ...x, start: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Slot ${i + 1} end`}
                  type="time"
                  value={slot.end}
                  onChange={(e) =>
                    set({
                      ...s,
                      slots: s.slots.map((x) =>
                        x.id === slot.id ? { ...x, end: e.target.value } : x,
                      ),
                    })
                  }
                />
                <label className="small">
                  <input
                    type="checkbox"
                    checked={slot.isBreak}
                    onChange={(e) =>
                      set({
                        ...s,
                        slots: s.slots.map((x) =>
                          x.id === slot.id
                            ? { ...x, isBreak: e.target.checked }
                            : x,
                        ),
                      })
                    }
                  />{" "}
                  Break
                </label>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={`Remove slot ${i + 1}`}
                  onClick={() =>
                    set({
                      ...s,
                      slots: s.slots.filter((x) => x.id !== slot.id),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              className="btn text-btn"
              onClick={() => {
                const last = s.slots[s.slots.length - 1];
                set({
                  ...s,
                  slots: [
                    ...s.slots,
                    {
                      id: uid(),
                      start: last?.end || "08:30",
                      end: "17:00",
                      isBreak: false,
                    },
                  ],
                });
              }}
            >
              <Plus size={16} />
              Add time slot
            </button>
          </section>
        </div>
        <aside>
          <section className="panel settings-section">
            <h2>Combined classes</h2>
            <p className="muted small">
              Set the default maximum number of department-semester groups that
              may share a class.
            </p>
            <Field label="Maximum groups per class">
              <input
                type="number"
                min="1"
                max="100"
                value={s.maxCombine}
                onChange={(e) => set({ ...s, maxCombine: +e.target.value })}
              />
            </Field>
            <p className="small muted">
              You can override this for each shared subject.
            </p>
          </section>
          <section className="panel settings-section">
            <h2>Room types</h2>
            <div className="tags">
              {s.roomTypes.map((t) => (
                <span className="badge" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="inline-add">
              <input
                aria-label="New room type"
                placeholder="e.g. Chemistry lab"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <button
                className="icon-btn"
                aria-label="Add room type"
                onClick={() => {
                  if (newType.trim() && !s.roomTypes.includes(newType.trim())) {
                    set({ ...s, roomTypes: [...s.roomTypes, newType.trim()] });
                    setNewType("");
                  }
                }}
              >
                <Plus size={18} />
              </button>
            </div>
          </section>
          <div className="soft-note">
            <strong>Designed around your week.</strong>
            <p>
              Notes inside a class are display-only. Availability and clash
              checks always use these configured slots.
            </p>
          </div>
          <section className="panel settings-section workspace-data">
            <h2>Workspace data</h2>
            <p className="muted small">
              Manage backups and the data in this browser.
            </p>
            <button className="btn secondary" onClick={onImport}>
              Import backup
            </button>
            <button className="btn secondary" onClick={onRestore}>
              Restore previous snapshot
            </button>
            <button className="btn secondary" onClick={onLoadSample}>
              Load sample data
            </button>
            <button className="btn secondary" onClick={onReset}>
              Reset workspace
            </button>
            <p className="muted small">
              Sample data and resets require confirmation. The previous saved
              workspace is retained for recovery.
            </p>
          </section>
        </aside>
      </fieldset>
      {pending && (
        <Confirm
          title="Review setup changes"
          action="Apply setup changes"
          onClose={() => setPending(null)}
          onConfirm={() => apply(pending)}
        >
          <p>
            These changes remove{" "}
            <strong>
              {p.sessions.length - pending.sessions.length} scheduled classes
            </strong>
            ,{" "}
            <strong>
              {p.offerings.length - pending.offerings.length} subject offerings
            </strong>
            , and <strong>{p.rooms.length - pending.rooms.length} rooms</strong>{" "}
            that no longer fit the setup. Custom availability will be updated to
            the remaining days and slots.
          </p>
          <p>You can undo after applying.</p>
        </Confirm>
      )}
    </>
  );
}
