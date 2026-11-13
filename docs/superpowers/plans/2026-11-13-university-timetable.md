# University Timetable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the university-owned timetable application agreed in the design, with automatic scheduling, editable schedules, reliable local recovery, and branded exports.

**Architecture:** A static React application uses typed domain functions for validation, scheduling, and editing. IndexedDB owns persisted project snapshots; generation runs in a cancellable worker and returns a candidate for review before application. UI filters select views without changing the underlying timetable.

**Tech Stack:** React, TypeScript, Vite, CSS, IndexedDB, Web Workers, Vitest, Playwright; PDF and XLSX libraries selected after verifying current official documentation and licenses.

**Spec:** `docs/superpowers/specs/2026-11-13-university-timetable-design.md`

## Global Constraints

- No login, live collaboration, central database, individual student clash detection, sections, student counts, capacity-based room selection, attendance, or university information system integration in this release.
- Slot times alone define occupancy, including for labs.
- Notes do not alter scheduling duration.
- Navy `#0C1460` and red `#D71D20`; preserve the supplied official logo.
- Every automatic change is previewed; locks survive regeneration and balancing.
- GitHub Pages deployment must support repository subpaths; no production timetable data is bundled.
- Use `npm.cmd` on this Windows machine because PowerShell blocks `npm.ps1`.

## Review Focus

1. Imported backups with broken references or malicious spreadsheet-like text must fail validation or remain literal text, without replacing current data.
2. Changes to setup with an existing timetable require impact review and must not silently remove classes.
3. Stale worker results and a second browser tab must never overwrite newer edits.
4. Shared classes crossing filter boundaries must appear once while retaining all memberships and global conflict checks.
5. Long notes and multilingual names must wrap in exported files without clipping or missing glyphs.

## File Structure

- `src/domain/types.ts`, `validation.ts`, `issues.ts`, `editing.ts`, `selectors.ts`: shared data contracts and pure operations.
- `src/storage/projectStore.ts`, `tabOwnership.ts`, `backup.ts`: versioned saves, recovery, tab ownership, validated backups.
- `src/scheduler/grouping.ts`, `search.ts`, `protocol.ts`, `scheduler.worker.ts`: grouping and cancellable candidate generation.
- `src/app/App.tsx`, `useProject.ts`, `styles.css`: responsive shell, state integration, tokens and motion.
- `src/components/`: focused reusable controls, dialogs, notices, availability grid, searchable grouped picker.
- `src/features/setup/`, `teachers/`, `rooms/`, `subjects/`: data entry and shared-subject controls.
- `src/features/timetable/`: grid, filters, editor, moves/swaps, locks, candidate preview, workload and issues views.
- `src/export/`: common export projection, PDF and Excel writers.
- `tests/domain/`, `tests/storage/`, `tests/scheduler/`, `tests/export/`, `tests/e2e/`: behavior verification.
- `public/brand/UOR.png`, `public/fonts/`: original branding and locally served licensed fonts.
- `.github/workflows/pages.yml`, `README.md`: deploy workflow and operator/developer instructions.

## Task 1: Application foundation and validated domain

**Interfaces:** `Project` contains schemaVersion, revision, settings, departments, subjects, offerings, teachers, rooms, teachingGroups, sessions, and savedAt. `Session` refers to teachingGroupId, teacherId, roomId, dayId, slotId and contains note and locked. A `TeachingGroup` owns subjectId, offeringIds, weeklyClasses, and roomType. `validateProject(value: unknown): ValidationResult<Project>` parses untrusted state. `findIssues(project: Project): Issue[]` reports issues linked to session IDs.

- [ ] Create Vite/React/TypeScript scripts, Vitest configuration, domain types, and synthetic fixtures; copy original logo without modification. Initialize local Git with `.tmp`, dependencies, builds, and test artifacts ignored.
- [ ] Write failing tests: `overlappingSlotsRejected`, `adjacentSlotsAccepted`, `invalidReferencesRejected`, `sharedMembershipConflictReported`, `notesDoNotExtendSlots`; assert validation failure/success and both offending session IDs.
- [ ] Run `npm.cmd test -- tests/domain`; expect failures for missing domain functions.
- [ ] Implement validation, stable IDs, time parsing, global issue detection, room/availability checks, repeated-day and weekly-count issues. Require consistent teacher assignment within a teaching group.
- [ ] Rerun domain tests; expect all pass. Run `npm.cmd run build`; expect successful type checking and bundle. Commit this independently testable foundation.

## Task 2: Autosave, recovery, and portable backups

**Interfaces:** `ProjectStore.load(): Promise<SavedProject | null>`, `save(project: Project): Promise<void>`, `archiveAndReplace(project: Project): Promise<void>`, `loadRecovery(): Promise<SavedProject | null>`. `parseBackup(text: string): ValidationResult<Project>`. Ownership exposes `claim`, `release`, and `subscribe`; only the current owner can write.

- [ ] Write failing tests for transactional save/reopen preserving notes/locks, failed save status, schema-version rejection, invalid import leaving existing state intact, archive-before-replace, and second-tab takeover invalidating the prior writer.
- [ ] Run `npm.cmd test -- tests/storage`; expect missing storage implementation failures.
- [ ] Implement IndexedDB snapshots and serialized saves with revision checks, a tab ownership protocol, import validation, and schema-versioned JSON export. Save errors must propagate; do not mark failed writes as saved.
- [ ] Run storage tests; expect pass. Integrate a React `useProject` controller exposing save status, recovery decisions, transaction-based updates, undo/redo, read-only ownership, and backup preview. Commit.

## Task 3: Branded shell and complete setup workflow

**Interfaces:** Feature panels consume `project: Project`, `readOnly: boolean`, and `onChange(next: Project): void`. Setup mutations produce `SetupImpact` before applying changes that affect existing sessions. AvailabilityGrid edits day/slot ID pairs; grouped subject picker resolves selections to catalog subject IDs.

- [ ] Add browser tests describing semester-first subject entry, catalog reuse by code, duplicate-code rejection, grouped searchable teacher eligibility, all/custom availability, and setup impact preview preserving existing sessions on cancel.
- [ ] Run `npm.cmd run test:e2e -- --grep setup`; expect missing application workflow failures.
- [ ] Implement navy sidebar, light logo header, responsive content workspace, summary cards, clear primary actions, accessible dialogs and keyboard focus, and reduced-motion-aware transitions. Use local fonts, restrained shadows, generous spacing, and horizontally scrollable tables on small screens.
- [ ] Implement settings, teaching days, editable slots/breaks, semester dropdown, departments, offerings, catalog, shared-subject detection/permission/combining limits, teacher and room forms, staff-defined room types, and autosave/recovery controls. Start production projects empty; synthetic demo data is explicitly opt-in.
- [ ] Run setup browser tests; expect pass. Inspect desktop and mobile layouts with screenshots and verify the supplied logo remains legible. Commit.

## Task 4: Automatic grouping and background scheduling

**Interfaces:** `generateCandidate(project: Project, options: SearchOptions, report: (progress: Progress) => void): GenerationResult`; result includes teachingGroups, sessions, unplaced requirements, diagnostics, change summary, inputRevision, and stop reason. Protocol messages carry runId and inputRevision. Worker cancellation terminates a run and preserves current state.

- [ ] Write failing scheduler tests: shared subject permission respected; combining maximum respected; mismatched weekly counts/room types split; grouping alternatives explored; eligible teachers only; same teacher per group; locks and notes preserved; no new resource/group clashes; repeated days warned when necessary; no eligible teacher yields actionable unplaced requirements.
- [ ] Include regressions for locked partial groups, existing conflicting locks, stale run results, cancellation without mutation, and a bounded timeout returning a partial result without asserting infeasibility.
- [ ] Run `npm.cmd test -- tests/scheduler`; expect missing generator failures.
- [ ] Implement grouping alternatives plus constrained-first backtracking/restarts and a bounded budget. Rank candidates by fulfilled requirements, repeated-day violations, then workload balance. Preserve locked membership, assignments and notes; compute workload once per session and track distinct subjects/groups.
- [ ] Wire generation progress/cancel, preview of grouping/placement/teacher changes, diagnostics, apply/undo, and rejection of stale results. Balancing uses the same preview path and preserves locks.
- [ ] Run scheduler tests and benchmark a synthetic university dataset (at least 8 departments, 5 semesters, 12 rooms, 30 teachers, 300 requested sessions). Record actual runtime and coverage; do not promise an unmeasured target. Commit.

## Task 5: Timetable editing, filters, warnings, and locks

**Interfaces:** `selectSessions(project: Project, filter: TimetableFilter): Session[]`; `moveSession(project, sessionId, placement): EditResult`; `swapSessions(project, firstId, secondId): EditResult`; operations are atomic and return a new project or a lock/reference error. Issue detection remains global.

- [ ] Write failing domain tests asserting an empty-cell move, atomic occupied-cell swap, locked operation rejection, note preservation, undo/redo, filtered shared-class deduplication with full membership labels, and conflicts outside the current filter.
- [ ] Run `npm.cmd test -- tests/domain/editing.test.ts tests/domain/selectors.test.ts`; expect missing operation failures.
- [ ] Implement day/room grid with sticky slot headings, department/semester filters, optional note rendering, cell editor, drag/drop, explicit multi-occupant target selector, keyboard/touch move/swap controls, lock icons, and immediate light red warnings with text/icons.
- [ ] Add workload and Issues panels with navigation to affected sessions; manual clashes are allowed, malformed data is rejected. Require unlocking before changes; make weekly requirement discrepancies visible.
- [ ] Run domain tests and browser workflows covering edit, drag/swap, warning resolution, filters, reload recovery, and generation undo. Expect pass; commit.

## Task 6: PDF, Excel, and backup user flows

**Interfaces:** `buildExportModel(project: Project, scope: ExportScope, filter: TimetableFilter): ExportModel`; `exportPdf(model: ExportModel): Promise<Blob>`; `exportExcel(model: ExportModel): Promise<Blob>`. Scope is `filtered` or `university`; all writers share the same projection.

- [ ] Check current official export-library documentation and licenses, then select libraries supporting vector text, embedded fonts, repeat headers, and XLSX styling. Store necessary licensed fonts locally with license files.
- [ ] Write failing tests for filter projection, shared-class labels, blank-note omission, read-only export behavior, long/multilingual content, and spreadsheet formula-like strings remaining literal. Check XLSX round-trip cell values and PDF extractable text.
- [ ] Run `npm.cmd test -- tests/export`; expect missing writer/projection failures.
- [ ] Implement branded portrait Letter PDF, repeated headers/page numbers, wrapping and overflow pages, and warnings legend. Use an explicit readable-font policy with fallback glyph coverage; keep original logo proportions.
- [ ] Implement XLSX timetable sheets plus Classes and Issues sheets, wrapped values, print setup, and current/full export choices. Add backup import preview, download, and restore controls.
- [ ] Run export tests; render PDF pages and inspect long content, page breaks, branding and actual glyphs. Inspect generated workbook structure and formatting. Commit.

## Task 7: Whole application verification and deployment preparation

**Interfaces:** `npm.cmd run check` runs type checks and tests; `npm.cmd run build` creates `dist/`; `npm.cmd run test:e2e` exercises browser workflows.

- [ ] Verify the complete path: new project → configure → enter subjects/resources → approve combining → generate → preview/apply → edit/swap → resolve warnings → lock/regenerate → export → reload/resume → backup/import. Verify second-tab read-only/takeover and forced save failure handling.
- [ ] Review all TSX using the React best-practices skill, verify keyboard use, focus visibility, contrast, reduced motion, empty/loading/error states, desktop/mobile layout, and a large scrollable timetable.
- [ ] Add Pages workflow with least required permissions, clean dependency installation, tests/build, uploaded static artifact, and deployment. Derive Vite base from repository name in CI; verify assets and worker URLs under a non-root base.
- [ ] Document local startup, building, deployment ownership, browser-local storage limits, backups, and generation limitations. Keep publishing pending university repository details.
- [ ] Run fresh full checks/build/browser tests, review the whole change, and correct material findings. Record passed checks and any remaining limitations. Commit and present the working local app and reviewable deployment configuration.

## Execution order and review

Tasks run in order with focused verification after each. A final independent review checks the complete flow. Native execution in the current session is recommended because storage, scheduling, and editing share a single evolving data contract. No deployment or external repository creation is included until the destination is known.
