# University timetable generator — proposed design

Status: approved for implementation by the user's instruction to start building, including the supplied branding. Date: 13 November 2026.

## Purpose and ownership

Replace manual university timetable preparation with automatic scheduling, visible conflict reporting, and editable university-wide schedules. A central university team operates the application. The university will own the source and deployment accounts; the exact GitHub organization/repository is to be supplied when publishing.

No student enrollment records are collected. The first release runs without authentication, with independent work saved in each browser on each computer. It does not synchronize computers.

## Goals

- Generate a combined timetable across all departments and semesters using staff-entered teaching days, slots, teacher eligibility/availability, room types/availability, and required classes per week.
- Detect teacher, room, and department-semester group conflicts across the entire timetable, including when filters hide affected classes.
- Detect shared subjects, obtain staff permission to combine them, then automatically form combined teaching groups and assign eligible teachers.
- Support click editing, moves, swaps, optional notes, locks, workload summaries, and warnings.
- Recover saved work after reopening and export readable PDF and Excel timetables plus portable backups.

## Exclusions and limits

No login, live collaboration, central database, individual student clash detection, sections, student counts, capacity-based room selection, attendance, or university information system integration in this release. Room suitability uses room type, not capacity. Notes do not alter scheduling duration. Generation is a constrained search and cannot promise to find every possible solution within a bounded runtime.

## Approaches considered

1. Browser application hosted on GitHub Pages: all scheduling, storage, and exports occur locally. Simple hosting and fits independent work; performance depends on the user's computer and browser storage can be cleared.
2. Application with a separate server: supports centralized scheduling and later shared data but adds infrastructure and maintenance before those capabilities are required.

The user selected option 1. Proposed implementation choices: React and TypeScript with Vite, IndexedDB for structured local storage, a Web Worker for scheduling, and dedicated PDF/Excel generation. Libraries and styling details remain builder choices subject to compatibility and licensing checks. Shared storage can be added behind a storage interface later; real collaboration will additionally need access control, concurrency handling, and synchronization.

## Data and setup

### University branding

Official asset received: `docs/brand/UOR.png` (1009 × 313 PNG), supplied by the user for the University of Rawalpindi. Measured dominant opaque logo colors are navy `#0C1460` and red `#D71D20`. Use navy for primary navigation, headings, and primary actions; red for selected accents; white and subtle neutral surfaces for readability. Preserve the original image, including transparency, without recoloring or distortion. The full horizontal wordmark should appear on a light header background. Red accents must not be the sole means of identifying clashes: retain warning icons/text and the separate light red conflict background.

Display the supplied official logo in the application header with an appropriate text alternative. Use its measured colors consistently across navigation, buttons, forms, timetable controls, and export headings with readable contrast. Preserve light red conflict highlighting as a distinct warning state. The sample PDF's cyan heading is a layout reference, not an approved brand palette.

All records use stable IDs; names and labels can change without breaking assignments.

- University settings: display name, term title, semester count selected through a dropdown, selected teaching weekdays, one ordered set of weekly slots, break slots, and default maximum number of department-semester groups per combined class. Staff enter the combining limit; the product does not assume a university policy value.
- Slots: start and end time, internal 24-hour representation, readable display label. A slot repeats on all selected days. Reject reversed or overlapping definitions; adjacent slots are allowed. Break slots are excluded from generation. There are no day-specific slots in release 1.
- Departments and active department-semester groups: departments have names and short labels; staff work semester first, then department. No sections or student counts.
- Subject catalog: unique university-wide code and name. A catalog subject can be reused in multiple department-semester offerings. An offering records required classes per week and required room type. Selecting an existing code reuses the catalog record rather than creating a duplicate.
- Shared subject settings: automatically list codes found in multiple offerings. Combining is off until staff enable it for that subject. An optional subject-specific maximum overrides the university default. Unchecked subjects remain separate for each department-semester group.
- Teachers: name, eligible catalog subjects, and availability. A searchable subject picker groups offerings under headings such as `CS — Semester 5`; selections resolve to the shared catalog subject, and selected subjects show their associated offerings. Radio options are all teaching days/slots or a custom availability grid.
- Rooms: name, type (classroom, computer lab, pharmacy lab, studio, or staff-defined type), and the same all-slots/custom availability choices. Any department can use any room with a matching type.

Input forms validate required fields, unique codes, positive whole weekly counts and combining limits, and stale references. Availability choices refer to slot/day IDs. Changing setup must never silently discard scheduled work; a preview identifies affected classes and requests an explicit choice about their removal or reassignment.

## Automatic grouping and scheduling

Staff select eligible teachers; they do not have to manually select attending combinations. For approved shared subjects, partition compatible offerings into teaching groups up to the configured maximum. Every offering belongs to exactly one teaching group for that subject in a generated candidate. A teaching group may span departments and semesters. Different groups of the same subject may use the same teacher at different times or different teachers.

Builder proposal: combine offerings only when subject code, weekly class count, and room type match. Different requirements remain in separate groups and are explained in the generation summary. Do not infer compatibility from similar names. Each combined session satisfies one weekly class requirement for each participating offering; count it once in the teacher's workload.

Jointly consider grouping, eligible teacher assignment, rooms, and slots; do not permanently choose groups before considering feasibility. Keep one teacher per teaching group throughout a candidate. Availability, required room type, and locks are strict for automatic generation. Prevent simultaneous use of a teacher, room, or any participating department-semester group. Slot times alone define occupancy, including for labs. A note such as `2-hour lab` is display text only, even if the configured slot is shorter.

Prefer separate teaching days for sessions of the same teaching group. If necessary, permit multiple sessions on one day and flag all affected sessions as a repeated-day warning. This is a preference violation, distinct from an overlap.

Prefer balanced weekly session counts among eligible teachers after maximizing scheduled requirements and spreading days. Availability and eligibility can make unequal workloads appropriate. No fixed workload ceiling is assumed. Show total classes and distinct subjects per teacher; count distinct teaching groups as well so repeated delivery is visible.

Use bounded search with constrained-first choices, backtracking/restarts, and a lexicographic objective: preserve locks and strict rules; maximize fulfilled requirements; reduce repeated-day warnings; improve workload balance. Allow progress reporting and cancellation. Preserve the current timetable while computing. Preview the candidate and its changes before applying; applying is atomic and undoable. A timeout means no complete solution was found within the search budget, not proven infeasibility.

Missing eligibility, insufficient availability, or an incomplete search produces a list of unplaced requirements with actionable diagnostics. Do not invent overlapping placements automatically. Reports distinguish demonstrable input problems from search limitations.

## Timetable and editing

Default layout follows the supplied `D:\Timetable Fall 2026.pdf`: day groups with room rows and time-slot columns. Show subject, participating department-semester labels, teacher, optional note, and state icons. Include all configured rooms and slots, with explicit break cells. The sample is a visual reference, not a source of production data or additional requirements; its sections and merged multi-slot classes do not override the agreed scope.

Filters: department, semester, or both. Semester-only shows all departments in that semester. Combined classes appear once if they match any selected group and retain all participating group labels. Editing always updates the shared underlying local timetable. Filtering never changes conflict detection or generation scope.

Click a class to edit subject/teaching group, teacher, room, day, slot, and note. Changing group membership or subject uses explicit existing records and revalidates requirement totals; it must not silently create catalog data. Empty notes render no note container or reserved space. Notes move with their class.

Drag onto an empty room/day/slot cell to move; drag onto a cell containing exactly one class to swap placements. Swap both room and time/day positions atomically. Since manual edits can create overlaps, a conflicted cell can contain multiple stacked class cards; dropping onto such a cell opens an explicit target selector rather than choosing an arbitrary class. Provide equivalent move/swap controls for keyboard and touch use, plus undo/redo for timetable edits.

Allow manual conflicts and unavailable or unsuitable assignments to save with warnings. Highlight every affected class in light red with a warning icon and accessible text. Maintain a dedicated Clashes & Issues view for teacher/room/group overlaps, unavailable resources, wrong room types, repeated-day warnings, and unmet/excess weekly requirements. Recompute after every edit and clear resolved issues automatically. Invalid time formats, missing required references, or malformed records remain form errors rather than saved conflicts.

Locks preserve teacher, room, day, slot, and teaching-group membership during regeneration and balancing. Show a lock icon. Direct edits/moves/swaps involving a locked class require unlocking it first. Preserve its note on regeneration as well. Fixed classes with pre-existing manual conflicts remain intact; report those conflicts and avoid adding new ones. Validate feasibility against all groups represented by a locked class.

Every automatic reassignment produces a visible before/after summary identifying the subject/group, old/new teacher, workload changes, and reason. Regeneration also previews placement/grouping changes. A balancing action cannot silently modify or override a lock.

## Local autosave and recovery

Use versioned IndexedDB records with an asynchronous storage interface. Save completed edits immediately; debounce typing briefly and show Saving, Saved, or Save failed accurately. Generation drafts never overwrite the last applied timetable. Use transactional updates and retain a prior recovery snapshot before destructive operations. Do not rely on tab-close events for the primary save path.

Updated by the dashboard amendment: open directly into the app, automatically restore saved work and the last selected view, and show only a small dismissible restoration notice. First use opens Dashboard with direct setup shortcuts. Resetting the workspace is an explicit Settings action requiring replacement confirmation and retaining a recoverable previous snapshot. Store notes, locks, setup, requirements, and applied placements. A tab closed before a write completes may lose the latest keystrokes; do not promise zero loss under abrupt process/power failure.

Portable JSON export/import includes schema version, all setup, and schedule data. Validate imports completely and preview replacement before applying. PDF/Excel are outputs, not backups. Browser data remains tied to the browser profile and site origin; clearing site data, private browsing, or changing deployment origin can remove access to it. Show this succinctly in storage/backup help. If another tab opens the same project, detect it and make the second tab read-only until it explicitly takes over, preventing accidental last-writer data loss.

## PDF and Excel

Both exports offer Current filtered view and Full university. Preserve all participating labels for shared classes and the same configured slot headings and optional notes.

PDF: use vector text and borders with embedded fonts supporting entered text, university/term heading, readable teacher emphasis, consistent margins, repeating headers, and page numbering. Start with portrait Letter, as in the sample. Prefer one day per page when readable, but split across pages with repeated headers rather than shrinking to illegible text or clipping content. Wrap long names and notes, keep class cells intact where possible, and retain light red warning indications and a small explanatory legend when warnings exist. Quality is judged through rendered and printed-page inspection, not a blanket guarantee.

Excel: a genuine `.xlsx` workbook with readable timetable sheets, wrapped cells, room/day/slot labels, notes within class text, usable widths, and print setup. Include an Issues sheet and a structured Classes sheet with one row per scheduled session for practical filtering. Escape spreadsheet formula-like user text as literal values. Exports must not alter autosaved state.

## Delivery, verification, and later work

Source and build workflow belong in the university-controlled GitHub repository. Build static assets and publish with GitHub Actions to GitHub Pages, supporting repository subpaths. No private timetable data or secrets are included in the repository or deployment; data entered into this release stays in browser storage unless exported. Actual publishing awaits the repository/account details and authorized deployment step.

Verify scheduler invariants with realistic synthetic multi-department data: shared teaching, eligible teachers, incompatible combining requirements, restricted availability, repeated days, locks, partial results, and cancellation. Exercise move/swap atomicity, conflict highlighting, filter semantics, save/reopen recovery, import validation, and long/multilingual export content. Inspect PDFs and open Excel exports; run production build and test repository-subpath loading. Benchmark a representative whole-university scenario before claiming generation performance; the sample indicates scale but no runtime target is agreed yet.

Later: authentication, centrally shared storage, live updates, student-count/capacity handling, and enrollment-based clashes. These require additional design rather than being silently enabled in release 1.

## Decisions proposed by the builder for approval

The conversation establishes the product requirements above. The following details are proposals: React/TypeScript/Vite, IndexedDB and a worker; compatibility rules for automatic grouping; one teacher per generated teaching group; balancing by weekly session count; preview/apply/undo for generation; unlocking before direct edits; room-based table layout following the sample; prevention of simultaneous editing in multiple tabs; portrait Letter PDF with overflow pages; and structured supplementary Excel sheets. Default generation budgets and exact UI/library choices are left to implementation and validation.
