import { hasRemovedTimetable } from "../domain/timetables";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyProject, type Project } from "../domain/types";
import { validateProject } from "../domain/validation";
import { ProjectStore } from "../storage/projectStore";
import { Autosaver } from "../storage/autosaver";
export function useProject() {
  const store = useRef<ProjectStore | null>(null);
  if (!store.current) store.current = new ProjectStore();
  const [project, setProject] = useState<Project>(emptyProject),
    [ready, setReady] = useState(false),
    [restored, setRestored] = useState(false),
    [status, setStatus] = useState("All changes saved"),
    [error, setError] = useState(""),
    [readOnly, setReadOnly] = useState(true),
    [formsEpoch, setFormsEpoch] = useState(0),
    [history, setHistory] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]);
  const current = useRef(project),
    owner = useRef(false),
    release = useRef<(() => void) | null>(null),
    channel = useRef<BroadcastChannel | null>(null);
  const autosaver = useRef<Autosaver | null>(null);
  if (!autosaver.current)
    autosaver.current = new Autosaver(store.current!, setStatus, setError);
  useEffect(() => {
    store
      .current!.load()
      .then((p) => {
        if (p) {
          const valid = validateProject(p);
          if (valid.ok) {
            setRestored(true);
            current.current = valid.value;
            setProject(valid.value);
          } else
            setError(
              "Saved work could not be read. Import a backup to recover.",
            );
        }
        setReady(true);
      })
      .catch(() => {
        setError(
          "Browser storage is unavailable. Export backups to preserve your work.",
        );
        setReady(true);
      });
  }, []);
  const claim = useCallback((takeover = false) => {
    if (takeover) channel.current?.postMessage("takeover");
    if (!navigator.locks) {
      owner.current = true;
      setReadOnly(false);
      return;
    }
    void navigator.locks
      .request(
        "uor-timetable-editor",
        takeover ? {} : { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            setReadOnly(true);
            return;
          }
          const latest = await store.current!.load();
          if (
            latest &&
            (latest.id !== current.current.id ||
              latest.revision !== current.current.revision)
          ) {
            current.current = latest;
            setProject(latest);
            setHistory([]);
            setFuture([]);
            setFormsEpoch((n) => n + 1);
          }
          if (!latest) autosaver.current!.enqueue(current.current);
          owner.current = true;
          setReadOnly(false);
          await new Promise<void>((resolve) => {
            release.current = resolve;
          });
          owner.current = false;
          setReadOnly(true);
          await autosaver.current!.drain();
          release.current = null;
        },
      )
      .catch(() => setError("Unable to acquire editing access"));
  }, []);
  useEffect(() => {
    const c = new BroadcastChannel("uor-timetable-control");
    channel.current = c;
    c.onmessage = (e) => {
      if (e.data === "takeover" && owner.current) {
        owner.current = false;
        setReadOnly(true);
        release.current?.();
      }
    };
    claim();
    return () => {
      c.close();
      release.current?.();
    };
  }, [claim]);
  const persist = useCallback((p: Project, replace = false) => {
    autosaver.current!.enqueue(p, replace);
  }, []);
  const update = useCallback(
    (next: Project, record = true) => {
      if (!owner.current) {
        setError("This tab is read-only. Take over editing to make changes.");
        return false;
      }
      if (
        next.id !== current.current.id ||
        next.revision !== current.current.revision
      ) {
        setError(
          "This form is based on older project data. Reopen it and review the latest values.",
        );
        return false;
      }
      const valid = validateProject(next);
      if (!valid.ok) {
        setError(valid.error);
        return false;
      }
      if (record) setHistory((h) => [...h.slice(-39), current.current]);
      setFuture([]);
      const p = {
        ...valid.value,
        revision: current.current.revision + 1,
        savedAt: new Date().toISOString(),
      };
      const previous = current.current;
      const sameTimetable =
        (previous.activeTimetableId || previous.id) ===
        (p.activeTimetableId || p.id);
      const destructive =
        hasRemovedTimetable(previous, p) ||
        (sameTimetable &&
          (previous.sessions.some(
            (s) => !p.sessions.some((n) => n.id === s.id),
          ) ||
            previous.offerings.some(
              (o) => !p.offerings.some((n) => n.id === o.id),
            ) ||
            previous.teachingGroups.some((g) =>
              g.offeringIds.some(
                (id) =>
                  !p.teachingGroups
                    .find((n) => n.id === g.id)
                    ?.offeringIds.includes(id),
              ),
            )));
      current.current = p;
      setProject(p);
      persist(p, destructive);
      return true;
    },
    [persist],
  );
  const start = useCallback(
    async (p?: Project) => {
      if (!owner.current) {
        setError("Take over editing before starting a new project");
        return;
      }
      const next = {
        ...(p || emptyProject()),
        revision: current.current.revision + 1,
        savedAt: new Date().toISOString(),
      };
      current.current = next;
      setProject(next);
      setHistory([]);
      setFuture([]);
      setRestored(false);
      setFormsEpoch((n) => n + 1);
      persist(next, true);
    },
    [persist],
  );
  const undo = () => {
    if (!owner.current || !history.length) return;
    const prior = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setFuture((f) => [current.current, ...f]);
    const p = {
      ...prior,
      revision: current.current.revision + 1,
      savedAt: new Date().toISOString(),
    };
    current.current = p;
    setProject(p);
    persist(p);
  };
  const redo = () => {
    if (!owner.current || !future.length) return;
    setHistory((h) => [...h, current.current]);
    const p = {
      ...future[0],
      revision: current.current.revision + 1,
      savedAt: new Date().toISOString(),
    };
    setFuture(future.slice(1));
    current.current = p;
    setProject(p);
    persist(p);
  };
  return {
    formsEpoch,
    project,
    ready,
    restored,
    status,
    error,
    setError,
    readOnly,
    takeover: () => claim(true),
    start,
    update,
    undo,
    redo,
    canUndo: !!history.length,
    canRedo: !!future.length,
    restore: async () => {
      const p = await store.current!.loadRecovery();
      if (p) await start(p);
      else setError("No previous recovery snapshot was found");
    },
  };
}
