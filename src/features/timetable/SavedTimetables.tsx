import { useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import type { Project } from "../../domain/types";
import { savedTimetableSummaries } from "../../domain/timetables";
import { Modal, Confirm, Empty } from "../../components/ui";

export function SavedTimetables({
  project,
  readOnly,
  onSelect,
  onDelete,
  onClose,
}: {
  project: Project;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => boolean;
  onClose: () => void;
}) {
  const [remove, setRemove] = useState<string | null>(null);
  const entries = savedTimetableSummaries(project);
  const target = entries.find((t) => t.id === remove);
  if (target)
    return (
      <Confirm
        title={`Delete ${target.name}?`}
        action="Delete timetable"
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (onDelete(target.id)) setRemove(null);
        }}
      >
        <p>
          This removes the timetable's classes, notes and locks from saved
          storage. Other saved timetables stay available.
        </p>
        {target.active && (
          <p>
            {entries.length > 1
              ? "Another saved timetable will become active."
              : "Your current setup data will remain available so you can generate another timetable."}
          </p>
        )}
        <p>
          You can undo this deletion. Download a backup first if you want a
          separate copy.
        </p>
      </Confirm>
    );
  return (
    <Modal title="Saved timetables" onClose={onClose} wide>
      <div className="modal-body">
        <p className="muted">
          Timetables are saved automatically in this browser. Open a saved
          timetable to view or edit it. Export backup includes all saved
          timetables.
        </p>
        {!entries.length ? (
          <Empty
            title="No saved timetables yet"
            description="Generate and apply a timetable to save it here."
          />
        ) : (
          <div className="saved-timetable-list">
            {entries.map((t) => (
              <article className="saved-timetable-row" key={t.id}>
                <div className="saved-timetable-info">
                  <CalendarDays size={20} />
                  <div>
                    <strong>{t.name}</strong>
                    <small>
                      {t.term} - {t.classes} classes
                      {t.active ? " - Active" : ""}
                    </small>
                  </div>
                </div>
                <div className="filter-row">
                  <button
                    className="btn secondary"
                    disabled={readOnly}
                    onClick={() => onSelect(t.id)}
                  >
                    View
                  </button>
                  <button
                    className="btn secondary"
                    disabled={readOnly}
                    onClick={() => setRemove(t.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
