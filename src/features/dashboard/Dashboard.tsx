import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  BookOpen,
  Users,
  Building2,
  ArrowUpRight,
  ArrowRight,
  Check,
  Clock3,
  Layers,
  TriangleAlert,
  LockKeyhole,
  Download,
  Settings2,
} from "lucide-react";
import type { Project, Issue } from "../../domain/types";
export type DashboardDestination =
  | "timetable"
  | "departments"
  | "subjects"
  | "teachers"
  | "rooms"
  | "issues"
  | "workload"
  | "settings";
export function Dashboard({
  project: p,
  issues,
  readOnly,
  onNavigate,
  onGenerate,
  onCreateNew,
  onBackup,
}: {
  project: Project;
  issues: Issue[];
  readOnly: boolean;
  onNavigate: (page: DashboardDestination) => void;
  onGenerate: () => void;
  onCreateNew: () => void;
  onBackup: () => void;
}) {
  const slots = p.settings.slots.filter((s) => !s.isBreak);
  const steps = [
    {
      page: "settings" as const,
      title: "Teaching days & time slots",
      detail: `${p.settings.days.length} days · ${slots.length} teaching slots · ${p.settings.semesterCount} semesters`,
      done: !!slots.length && !!p.settings.days.length,
      icon: Clock3,
    },
    {
      page: "departments" as const,
      title: "Departments",
      detail: p.departments.length
        ? `${p.departments.length} departments configured`
        : "Add the departments included in your timetable",
      done: !!p.departments.length,
      icon: GraduationCap,
    },
    {
      page: "subjects" as const,
      title: "Subjects & semester offerings",
      detail: p.offerings.length
        ? `${p.subjects.length} subjects · ${p.offerings.length} offerings`
        : "Enter subjects by semester and department",
      done: !!p.offerings.length,
      icon: BookOpen,
    },
    {
      page: "teachers" as const,
      title: "Teachers & availability",
      detail: p.teachers.length
        ? `${p.teachers.length} teachers · ${p.teachers.filter((t) => t.subjectIds.length).length} with eligible subjects`
        : "Assign subjects and available teaching slots",
      done:
        !!p.teachers.length &&
        p.offerings.every((o) =>
          p.teachers.some((t) => t.subjectIds.includes(o.subjectId)),
        ),
      icon: Users,
    },
    {
      page: "rooms" as const,
      title: "Rooms & availability",
      detail: p.rooms.length
        ? `${p.rooms.length} rooms across ${new Set(p.rooms.map((r) => r.type)).size} room types`
        : "Add shared classrooms, labs, and other spaces",
      done:
        !!p.rooms.length &&
        p.offerings.every((o) => p.rooms.some((r) => r.type === o.roomType)),
      icon: Building2,
    },
  ];
  const complete = steps.filter((s) => s.done).length;
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">ACADEMIC PLANNING WORKSPACE</span>
          <h1>
            Dashboard <span className="term-label">{p.settings.term}</span>
          </h1>
          <p>
            Manage university data, review scheduling status, and build your
            timetable.
          </p>
        </div>
        <div className="filter-row">
          <button
            className="btn secondary"
            onClick={() => onNavigate("timetable")}
          >
            <CalendarDays size={16} />
            Open timetable
          </button>
          {(p.sessions.length > 0 || !!p.savedTimetables?.length) && (
            <button
              className="btn secondary"
              disabled={readOnly}
              onClick={onCreateNew}
            >
              Create new timetable
            </button>
          )}
          <button
            className="btn primary"
            disabled={readOnly || !p.offerings.length}
            onClick={onGenerate}
          >
            <Layers size={16} />
            Generate timetable
          </button>
        </div>
      </div>
      <div className="stats-grid dashboard-stats">
        {[
          {
            label: "Departments",
            value: p.departments.length,
            detail: `Across ${p.settings.semesterCount} semesters`,
            icon: GraduationCap,
            color: "navy",
            page: "departments" as const,
          },
          {
            label: "Subject offerings",
            value: p.offerings.length,
            detail: `${p.subjects.length} unique university-wide codes`,
            icon: BookOpen,
            color: "purple",
            page: "subjects" as const,
          },
          {
            label: "Teaching faculty",
            value: p.teachers.length,
            detail: "Subjects & weekly availability",
            icon: Users,
            color: "teal",
            page: "teachers" as const,
          },
          {
            label: "Scheduled classes",
            value: p.sessions.length,
            detail: `${p.rooms.length} shared university rooms`,
            icon: CalendarDays,
            color: "navy",
            page: "timetable" as const,
          },
        ].map(({ label, value, detail, icon: Icon, color, page }) => (
          <button
            className="stat-card dashboard-stat"
            key={label}
            onClick={() => onNavigate(page)}
          >
            <div>
              <span className="stat-label">{label}</span>
              <strong>{value.toString().padStart(2, "0")}</strong>
              <small>{detail}</small>
            </div>
            <span className={`stat-icon ${color}`}>
              <Icon size={21} />
            </span>
          </button>
        ))}
      </div>
      <div className="dashboard-layout">
        <section className="panel setup-panel">
          <div className="panel-toolbar">
            <div>
              <h2>University setup</h2>
              <p className="muted small">
                Configure and maintain the data used by the generator.
              </p>
            </div>
            <span className={`status-pill ${complete === 5 ? "green" : ""}`}>
              {complete} of 5 ready
            </span>
          </div>
          <div className="setup-progress">
            <span style={{ width: `${(complete / 5) * 100}%` }} />
          </div>
          <div className="setup-list">
            {steps.map(({ page, title, detail, done, icon: Icon }, index) => (
              <button
                className="setup-step"
                key={page}
                onClick={() => onNavigate(page)}
              >
                <span className={`setup-step-icon ${done ? "complete" : ""}`}>
                  {done ? <Check size={18} /> : <Icon size={18} />}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
                <span className="setup-step-status">
                  {done ? "Manage" : "Configure"}
                  <Chevron size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="dashboard-side">
          <section className="panel schedule-status">
            <div className="section-heading">
              <span className="avatar color-0">
                <CalendarDays size={20} />
              </span>
              <h2>Schedule status</h2>
            </div>
            <div className="status-main">
              <strong>{p.sessions.length ? p.sessions.length : "—"}</strong>
              <span>
                {p.sessions.length
                  ? "classes in the current timetable"
                  : "No timetable generated yet"}
              </span>
            </div>
            <div className="status-details">
              <div>
                <span>
                  <TriangleAlert size={14} />
                  Clashes & issues
                </span>
                <button
                  className={issues.length ? "issue-number" : ""}
                  onClick={() => onNavigate("issues")}
                >
                  {issues.length}
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <div>
                <span>
                  <LockKeyhole size={14} />
                  Locked classes
                </span>
                <strong>{p.sessions.filter((s) => s.locked).length}</strong>
              </div>
              <div>
                <span>
                  <Layers size={14} />
                  Teaching groups
                </span>
                <strong>{p.teachingGroups.length}</strong>
              </div>
              <div>
                <span>
                  <Clock3 size={14} />
                  Teaching week
                </span>
                <strong>{p.settings.days.length} days</strong>
              </div>
            </div>
            <button
              className="btn secondary"
              onClick={() => onNavigate("timetable")}
            >
              View schedule
              <ArrowRight size={15} />
            </button>
          </section>
          <section className="workspace-storage">
            <span className="dot green-dot" />
            <div>
              <strong>Local workspace</strong>
              <p>
                Your changes save automatically in this browser. Use backups to
                transfer or preserve your data.
              </p>
              <button className="backup-link" onClick={onBackup}>
                <Download size={14} />
                Download backup
                <ArrowUpRight size={12} />
              </button>
            </div>
          </section>
        </aside>
      </div>
      <section className="panel dashboard-tools">
        <div className="panel-toolbar">
          <h2>Planning tools</h2>
          <span className="muted small">Direct access to your daily work</span>
        </div>
        <div className="tool-links">
          {[
            {
              page: "issues" as const,
              title: "Clashes & Issues",
              description: "Review conflicts across the university",
              icon: TriangleAlert,
              color: "color-2",
            },
            {
              page: "workload" as const,
              title: "Faculty workload",
              description: "Review weekly classes and teaching groups",
              icon: Users,
              color: "color-1",
            },
            {
              page: "settings" as const,
              title: "Workspace settings",
              description: "Teaching week, room types, and data tools",
              icon: Settings2,
              color: "color-0",
            },
          ].map(({ page, title, description, icon: Icon, color }) => (
            <button key={page} onClick={() => onNavigate(page)}>
              <span className={`avatar ${color}`}>
                <Icon size={20} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{description}</small>
              </div>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
function Chevron({ size }: { size: number }) {
  return <ArrowRight size={size} />;
}
