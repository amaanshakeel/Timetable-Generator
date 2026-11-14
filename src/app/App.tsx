import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  CalendarDays,
  Users,
  BookOpen,
  Building2,
  GraduationCap,
  TriangleAlert,
  Settings2,
  Download,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  RotateCw,
  FolderOpen,
  ShieldCheck,
  Layers,
  Menu,
  X,
  Upload,
  FileDown,
  Database,
  LoaderCircle,
  LockKeyhole,
  Info,
  LayoutDashboard,
} from "lucide-react";
import { useProject } from "./useProject";
import { sampleProject } from "../domain/demo";
import { type Project, type TimetableFilter } from "../domain/types";
import { findIssues } from "../domain/issues";
import { parseBackup } from "../storage/projectStore";
import { DataPanel } from "../features/setup/DataPanels";
import { SettingsPanel } from "../features/setup/SettingsPanel";
import { Dashboard } from "../features/dashboard/Dashboard";
import { TimetablePanel } from "../features/timetable/TimetablePanel";
import { IssuesPanel, WorkloadPanel } from "../features/timetable/IssuesPanel";
import { Modal, Confirm } from "../components/ui";
import type { GenerationResult, Progress } from "../scheduler/search";
type Page =
  | "dashboard"
  | "timetable"
  | "departments"
  | "subjects"
  | "teachers"
  | "rooms"
  | "issues"
  | "workload"
  | "settings";
const navigation: {
  id: Page;
  label: string;
  icon: ComponentType<{ size?: number }>;
  section?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "timetable", label: "Timetable", icon: CalendarDays },
  {
    id: "departments",
    label: "Departments",
    icon: GraduationCap,
    section: "UNIVERSITY DATA",
  },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "teachers", label: "Teachers", icon: Users },
  { id: "rooms", label: "Rooms", icon: Building2 },
  {
    id: "issues",
    label: "Clashes & Issues",
    icon: TriangleAlert,
    section: "PLANNING TOOLS",
  },
  { id: "workload", label: "Faculty workload", icon: Layers },
  { id: "settings", label: "Settings", icon: Settings2 },
];
export default function App() {
  const state = useProject(),
    p = state.project;
  const [page, setPage] = useState<Page>(() => {
      try {
        const saved = localStorage.getItem("uor-active-view");
        return navigation.some((n) => n.id === saved)
          ? (saved as Page)
          : "dashboard";
      } catch {
        return "dashboard";
      }
    }),
    [inspected, setInspected] = useState<string | undefined>(),
    [filter, setFilter] = useState<TimetableFilter>({}),
    [mobile, setMobile] = useState(false),
    [exporting, setExporting] = useState(false),
    [format, setFormat] = useState<"pdf" | "xlsx">("pdf"),
    [scope, setScope] = useState<"filtered" | "university">("university"),
    [busyExport, setBusyExport] = useState(false),
    [imported, setImported] = useState<Project | null>(null),
    [fresh, setFresh] = useState(false),
    [sample, setSample] = useState(false),
    [restorationDismissed, setRestorationDismissed] = useState(false),
    [result, setResult] = useState<GenerationResult | null>(null),
    [progress, setProgress] = useState<Progress | null>(null),
    [generating, setGenerating] = useState(false);
  const worker = useRef<Worker | null>(null),
    runId = useRef(""),
    input = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => findIssues(p), [p]);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    try {
      localStorage.setItem("uor-active-view", page);
    } catch {
      /* Preference only; project saving reports its own errors. */
    }
  }, [page]);
  useEffect(() => {
    const report = () =>
      state.setError(
        "An unfinished form could not be autosaved. Save the record or export a backup before closing.",
      );
    window.addEventListener("draft-save-failed", report);
    return () => window.removeEventListener("draft-save-failed", report);
  }, [state.setError]);
  function navigate(id: Page) {
    setInspected(undefined);
    setPage(id);
    setMobile(false);
  }
  function generate() {
    if (state.readOnly) return;
    setResult(null);
    setProgress(null);
    setGenerating(true);
    worker.current?.terminate();
    const w = new Worker(
      new URL("../scheduler/scheduler.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    const id = crypto.randomUUID();
    runId.current = id;
    w.onmessage = (e) => {
      if (e.data.runId !== runId.current) return;
      if (e.data.kind === "progress") setProgress(e.data.progress);
      if (e.data.kind === "result") {
        setResult(e.data.result);
        setGenerating(false);
        w.terminate();
        worker.current = null;
      }
      if (e.data.kind === "error") {
        state.setError(e.data.error);
        setGenerating(false);
        w.terminate();
        worker.current = null;
      }
    };
    w.onerror = (e) => {
      state.setError(
        e.message ||
          "Generation could not finish. Your current timetable is preserved.",
      );
      setGenerating(false);
      w.terminate();
    };
    w.postMessage({ runId: id, project: p });
  }
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    runId.current = "";
    setGenerating(false);
  }
  async function download() {
    setBusyExport(true);
    try {
      const { exportFile } = await import("../export/exports");
      await exportFile(p, format, scope, filter);
      setExporting(false);
    } catch (e) {
      state.setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusyExport(false);
    }
  }
  async function backup() {
    const { downloadBlob } = await import("../export/exports");
    downloadBlob(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      `UOR-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
  const logo = `${import.meta.env.BASE_URL}brand/UOR.png`;
  if (!state.ready)
    return (
      <div className="loading-screen">
        <img src={logo} alt="University of Rawalpindi" />
        <LoaderCircle className="spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <input
        ref={input}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.size > 20 * 1024 * 1024) {
              state.setError("Choose a backup smaller than 20 MB.");
              return;
            }
            const r = parseBackup(await file.text());
            if (r.ok) setImported(r.value);
            else state.setError(r.error);
          }
          e.target.value = "";
        }}
      />
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="brand">
          <img src={logo} alt="University of Rawalpindi" />
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            <CalendarDays size={17} />
          </span>
          <div>
            <strong>Timetable Studio</strong>
            <small>Academic planning workspace</small>
          </div>
          <span className="version">v1</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon, section }) => (
            <div key={id}>
              {section && <div className="nav-section">{section}</div>}
              <button
                className={`nav-item ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "issues" && issues.length > 0 && (
                  <span className="nav-count">{issues.length}</span>
                )}
                {id === "timetable" && <ChevronRight size={15} />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            onClick={backup}
            className="sidebar-backup"
            title="Your work saves automatically in this browser. Download a backup to keep a separate copy."
          >
            <Download size={15} />
            <span>Export backup</span>
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-foot">
            <div>
              <strong>Student Affairs</strong>
              <small>Central scheduling team</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <img
            className="mobile-brand"
            src={logo}
            alt="University of Rawalpindi"
          />
          <div className="breadcrumb">
            <button
              className="icon-btn menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Academic planning</span>
            <ChevronRight size={14} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`save-status ${state.status === "Save failed" ? "failed" : ""}`}
            >
              {state.status === "Saving…" ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <span className="dot green-dot" />
              )}
              {state.status}
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-btn"
              aria-label="Undo"
              title="Undo"
              disabled={!state.canUndo || state.readOnly}
              onClick={state.undo}
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="icon-btn"
              aria-label="Redo"
              title="Redo"
              disabled={!state.canRedo || state.readOnly}
              onClick={state.redo}
            >
              <RotateCw size={17} />
            </button>
            <button
              className="btn secondary export-top"
              onClick={() => setExporting(true)}
            >
              <Download size={16} />
              Export timetable
            </button>
          </div>
        </header>
        {state.readOnly && (
          <div className="readonly-bar">
            <LockKeyhole size={15} />
            <span>
              Another tab is editing this project. This tab is read-only.
            </span>
            <button className="btn text-btn" onClick={state.takeover}>
              Take over editing
            </button>
          </div>
        )}
        <main>
          <div className="page-content">
            {state.restored && !restorationDismissed && (
              <div className="restored-notice">
                <CheckCircle2 size={15} />
                <span>Saved workspace restored automatically.</span>
                <button
                  className="icon-btn"
                  aria-label="Dismiss restoration notice"
                  onClick={() => setRestorationDismissed(true)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {page === "dashboard" && (
              <Dashboard
                project={p}
                issues={issues}
                readOnly={state.readOnly}
                onNavigate={navigate}
                onGenerate={generate}
                onBackup={backup}
              />
            )}
            {page === "timetable" && (
              <TimetablePanel
                key={p.id + state.formsEpoch}
                initialSessionId={inspected}
                project={p}
                filter={filter}
                onFilter={setFilter}
                onChange={state.update}
                onGenerate={generate}
                readOnly={state.readOnly}
                issues={issues}
                onError={state.setError}
              />
            )}{" "}
            {["departments", "subjects", "teachers", "rooms"].includes(
              page,
            ) && (
              <DataPanel
                key={page + p.id + state.formsEpoch}
                kind={page as "departments" | "subjects" | "teachers" | "rooms"}
                project={p}
                onChange={state.update}
                readOnly={state.readOnly}
                onError={state.setError}
              />
            )}{" "}
            {page === "settings" && (
              <SettingsPanel
                onLoadSample={() => setSample(true)}
                onImport={() => input.current?.click()}
                onReset={() => setFresh(true)}
                onRestore={state.restore}
                key={p.id + state.formsEpoch}
                project={p}
                onChange={state.update}
                readOnly={state.readOnly}
                onError={state.setError}
              />
            )}{" "}
            {page === "issues" && (
              <IssuesPanel
                project={p}
                issues={issues}
                onInspect={(id) => {
                  setInspected(id);
                  setFilter({});
                  setPage("timetable");
                }}
              />
            )}{" "}
            {page === "workload" && <WorkloadPanel project={p} />}
          </div>
        </main>
      </div>
      {state.error && (
        <div className="toast" role="alert">
          <TriangleAlert size={20} />
          <p>{state.error}</p>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => state.setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {generating && (
        <Modal title="Generating timetable" onClose={cancel}>
          <div className="generation-wait">
            <div className="generation-orbit">
              <Sparkles size={30} />
            </div>
            <h3>Scheduling university classes</h3>
            <p>
              Checking teacher availability, shared groups, rooms, and locked
              classes.
            </p>
            <div className="progress-bar">
              <span />
            </div>
            <small>
              {progress
                ? `${progress.scheduled} classes placed · exploring alternative ${progress.attempt}`
                : "Preparing your university schedule…"}
            </small>
            <button className="btn secondary" onClick={cancel}>
              Cancel generation
            </button>
            <span className="small muted">
              Your current timetable stays intact until you apply changes.
            </span>
          </div>
        </Modal>
      )}
      {result && (
        <Modal
          title="Review generated timetable"
          onClose={() => setResult(null)}
          wide
        >
          <div className="modal-body">
            <div className="result-banner">
              <CheckCircle2 size={27} />
              <div>
                <strong>
                  {result.sessions.length} classes ready to review
                </strong>
                <p>
                  {result.teachingGroups.length} teaching groups ·{" "}
                  {(result.elapsedMs / 1000).toFixed(2)} seconds ·{" "}
                  {result.unplaced.reduce((n, u) => n + u.count, 0)} unplaced
                </p>
              </div>
            </div>
            {result.inputRevision !== p.revision && (
              <div className="notice error">
                Your data changed during generation. Generate again to use the
                latest version.
              </div>
            )}
            {result.unplaced.length > 0 && (
              <div className="notice error">
                <strong>Some requirements could not be placed</strong>
                {result.unplaced.map((u, i) => (
                  <p key={i}>
                    {result.teachingGroups.find((g) => g.id === u.groupId)
                      ? p.subjects.find(
                          (s) =>
                            s.id ===
                            result.teachingGroups.find(
                              (g) => g.id === u.groupId,
                            )?.subjectId,
                        )?.name
                      : u.groupId}
                    : {u.count} classes — {u.reason}
                  </p>
                ))}
                {result.stopReason === "budget" && (
                  <p>
                    The search budget ended; this does not prove a complete
                    timetable is impossible.
                  </p>
                )}
              </div>
            )}
            <details className="diff-view" open={p.sessions.length > 0}>
              <summary>
                Review all proposed changes ({result.diff.length})
              </summary>
              <div className="diff-list">
                {result.diff.map((change, index) => (
                  <article key={index}>
                    <span className="badge">{change.kind}</span>
                    <strong>{change.label}</strong>
                    <div>
                      <span>
                        <small>BEFORE</small>
                        {change.before}
                      </span>
                      <span>
                        <small>AFTER</small>
                        {change.after}
                      </span>
                    </div>
                  </article>
                ))}
                {!result.diff.length && (
                  <p className="muted small">
                    No placement, membership, or note changes.
                  </p>
                )}
              </div>
            </details>
            <h3>Teacher assignments</h3>
            <p className="muted small">
              Review automatic changes before applying. Locked classes remain
              intact.
            </p>
            <div className="changes-list">
              {result.changes.length ? (
                result.changes.map((change, i) => (
                  <p key={i}>
                    <ArrowRight size={14} />
                    {change}
                  </p>
                ))
              ) : (
                <p>No teacher reassignments.</p>
              )}
            </div>
            <h3>Weekly workload changes</h3>
            <div className="mini-workload">
              {p.teachers.map((t) => {
                const before = p.sessions.filter(
                    (s) => s.teacherId === t.id,
                  ).length,
                  after = result.sessions.filter(
                    (s) => s.teacherId === t.id,
                  ).length;
                return (
                  <div key={t.id}>
                    <span>{t.name}</span>
                    <strong>
                      {before} → {after} classes
                    </strong>
                  </div>
                );
              })}
            </div>
            <p className="notice">
              Applying replaces the unlocked schedule. You can undo the entire
              change. Any remaining warnings will appear in Clashes & Issues.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn secondary" onClick={() => setResult(null)}>
              Keep current timetable
            </button>
            <button
              className="btn primary"
              disabled={state.readOnly || result.inputRevision !== p.revision}
              onClick={() => {
                if (
                  state.update({
                    ...p,
                    teachingGroups: result.teachingGroups,
                    sessions: result.sessions,
                  })
                ) {
                  setResult(null);
                  setPage("timetable");
                }
              }}
            >
              Apply timetable
              <CheckCircle2 size={16} />
            </button>
          </div>
        </Modal>
      )}
      {exporting && (
        <Modal
          title="Export your timetable"
          onClose={() => !busyExport && setExporting(false)}
        >
          <div className="modal-body">
            <p className="muted">
              Choose a format and the timetable data to export.
            </p>
            <div className="export-options">
              {(["pdf", "xlsx"] as const).map((f) => (
                <button
                  className={format === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFormat(f)}
                >
                  <FileDown size={26} />
                  <strong>
                    {f === "pdf" ? "Print-ready PDF" : "Excel workbook"}
                  </strong>
                  <span>
                    {f === "pdf"
                      ? "Sharp text, branded headers"
                      : "Timetable, classes, and issues"}
                  </span>
                </button>
              ))}
            </div>
            <fieldset className="scope-options">
              <legend>What would you like to export?</legend>
              <label>
                <input
                  type="radio"
                  checked={scope === "university"}
                  onChange={() => setScope("university")}
                />
                Full university timetable
              </label>
              <label>
                <input
                  type="radio"
                  checked={scope === "filtered"}
                  onChange={() => setScope("filtered")}
                />
                Current department / semester filters
              </label>
            </fieldset>
            <div className="notice">
              <Info size={17} />
              <span>
                PDF and Excel are for sharing. Export a JSON backup to reopen an
                editable project.
              </span>
            </div>
            <button className="btn text-btn" onClick={backup}>
              <Database size={16} />
              Download editable backup instead
            </button>
          </div>
          <div className="modal-foot">
            <button
              className="btn secondary"
              onClick={() => setExporting(false)}
              disabled={busyExport}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busyExport}
              onClick={download}
            >
              {busyExport ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}{" "}
              {busyExport ? "Preparing file…" : "Download timetable"}
            </button>
          </div>
        </Modal>
      )}
      {imported && (
        <Confirm
          title="Import this project?"
          action="Import project"
          onClose={() => setImported(null)}
          onConfirm={() => {
            void state.start(imported);
            setImported(null);
            setPage("timetable");
          }}
        >
          <p>
            <strong>
              {imported.settings.university} · {imported.settings.term}
            </strong>
          </p>
          <p>
            {imported.departments.length} departments ·{" "}
            {imported.teachers.length} teachers · {imported.sessions.length}{" "}
            classes
          </p>
          <p>
            This replaces your current workspace. The previous saved project is
            retained as a recovery snapshot.
          </p>
        </Confirm>
      )}
      {fresh && (
        <Confirm
          title="Reset this workspace?"
          action="Reset workspace"
          onClose={() => setFresh(false)}
          onConfirm={() => {
            void state.start();
            setFresh(false);
            setPage("settings");
            setFilter({});
          }}
        >
          <p>
            Your current project will be retained as a recovery snapshot. Export
            a backup if you want to keep a separate copy.
          </p>
        </Confirm>
      )}
      {sample && (
        <Confirm
          title="Load sample data?"
          action="Replace with sample data"
          onClose={() => setSample(false)}
          onConfirm={() => {
            void state.start(sampleProject());
            setSample(false);
            setPage("timetable");
            setFilter({});
          }}
        >
          <p>
            This replaces the current workspace with fictional sample
            departments, subjects, teachers, and rooms. Your current saved
            workspace is retained as a recovery snapshot.
          </p>
        </Confirm>
      )}
    </div>
  );
}
