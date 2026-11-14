import {
  useEffect,
  useId,
  useRef,
  useState,
  cloneElement,
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, ArrowUpRight, CalendarDays } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">TIMETABLE STUDIO</span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      {Children.toArray(children).map((child, index) =>
        index === 0 && isValidElement(child)
          ? cloneElement(
              child as ReactElement<{
                id?: string;
                "aria-describedby"?: string;
              }>,
              { id, "aria-describedby": hint ? `${id}-hint` : undefined },
            )
          : child,
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <CalendarDays size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Form({
  children,
  onSubmit,
  submit = "Save changes",
  onClose,
  error,
}: {
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  submit?: string;
  onClose: () => void;
  error?: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        {children}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button type="button" className="btn secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" type="submit">
          {submit}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </form>
  );
}
export interface DraftStatus {
  conflict: boolean;
  restore: () => void;
  discard: () => void;
}
export function useDraft<T>(
  key: string,
  initial: T,
  baseRevision?: number,
  legacyKey?: string,
) {
  const tab = useRef<string>("");
  if (!tab.current) {
    try {
      tab.current =
        sessionStorage.getItem("uor-draft-tab") || crypto.randomUUID();
      sessionStorage.setItem("uor-draft-tab", tab.current);
    } catch {
      tab.current = "local";
    }
  }
  const prefix = "uor-draft-" + tab.current + "-" + key;
  const legacyPrefix = legacyKey
    ? "uor-draft-" + tab.current + "-" + legacyKey
    : undefined;
  const read = () => {
    try {
      const stored = localStorage.getItem(prefix);
      // Older class drafts were keyed by the current workspace revision.
      const legacy =
        !stored && legacyPrefix ? localStorage.getItem(legacyPrefix) : null;
      const parsed = JSON.parse(stored || legacy || "null") as {
        draftVersion: number;
        baseRevision?: number;
        value: T;
      } | null;
      return parsed && legacy ? { ...parsed, baseRevision } : parsed;
    } catch {
      return null;
    }
  };
  const [original] = useState(read);
  const [value, setValue] = useState<T>(() =>
    original?.draftVersion === 1 && original.baseRevision === baseRevision
      ? original.value
      : initial,
  );
  const [older, setOlder] = useState<T | null>(() =>
    original?.draftVersion === 1 && original.baseRevision !== baseRevision
      ? original.value
      : null,
  );
  const base = useRef(baseRevision);
  const identity = useRef(prefix);
  useEffect(() => {
    if (base.current !== baseRevision || identity.current !== prefix) {
      base.current = baseRevision;
      identity.current = prefix;
      const saved = read();
      setValue(
        saved?.draftVersion === 1 && saved.baseRevision === baseRevision
          ? saved.value
          : initial,
      );
      setOlder(
        saved?.draftVersion === 1 && saved.baseRevision !== baseRevision
          ? saved.value
          : null,
      );
    }
  }, [baseRevision, prefix]);
  const setDraft = (next: T) => {
    try {
      localStorage.setItem(
        prefix,
        JSON.stringify({ draftVersion: 1, baseRevision, value: next }),
      );
    } catch {
      window.dispatchEvent(new CustomEvent("draft-save-failed"));
    }
    setValue(next);
  };
  const clear = () => {
    localStorage.removeItem(prefix);
    if (legacyPrefix) localStorage.removeItem(legacyPrefix);
  };
  const discard = () => {
    clear();
    setValue(initial);
    setOlder(null);
  };
  return [
    value,
    setDraft,
    clear,
    {
      conflict: older !== null,
      restore: () => {
        if (older !== null) setDraft(older);
        setOlder(null);
      },
      discard,
    },
  ] as const;
}
export function DraftNotice({ draft }: { draft: DraftStatus }) {
  return draft.conflict ? (
    <div className="notice">
      <div>
        <strong>Newer project data is available.</strong>
        <p>
          An older unfinished draft was kept separately. Review it before
          replacing the latest values.
        </p>
        <div className="filter-row">
          <button
            type="button"
            className="btn secondary"
            onClick={draft.discard}
          >
            Use latest values
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={draft.restore}
          >
            Restore draft for review
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  action = "Confirm",
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  action?: string;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">{children}</div>
      <div className="modal-foot">
        <button className="btn secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={onConfirm}>
          {action}
        </button>
      </div>
    </Modal>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <label className="toggle-label" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" />
      <span>{label}</span>
    </label>
  );
}
