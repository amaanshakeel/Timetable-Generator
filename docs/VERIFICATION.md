# Implementation and verification record

Verified locally on 13 November 2026 using Node.js 24 and Chromium on Windows. The app is ready for local review; publishing to a university-owned repository remains a separate step.

## Dashboard revision

The later user-requested dashboard amendment replaces the welcome/start/resume screens. First use opens a functional Dashboard; reopening automatically restores data and the last selected view. Settings now contains the optional sample-data, import, recovery and reset actions, with confirmation before replacements. The marketing preview and page footer were removed.

After this change, TypeScript and all 26 unit/integration tests passed, all **13 browser workflows** passed, and the production build passed. Direct startup, immediate setup-form access, automatic data/view recovery, and the migrated scheduling/editing/export/takeover workflows were exercised. Desktop and mobile dashboards were visually inspected; the 390px layout has no document-width overflow. A focused independent review found no new material issues in the dashboard/startup change. The earlier 11-workflow record below describes the initial release verification.

## Checks completed

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- Unit/integration tests: 26 tests passed across domain validation, issues, scheduling, storage, queued autosave, and export behavior.
- Browser tests: all 11 workflows passed, including a project entered entirely through staff forms, unchanged subject saves and catalog name correction, destructive-edit preview, second-tab takeover with an older dirty draft, moves/swaps, locks and regeneration, warnings and issue navigation, autosave and draft recovery, PDF/XLSX downloads, and project draft isolation.
- Production build passed with `/Timetable-Generator/` as its base path. Browser verification under that path returned HTTP 200, loaded the logo and worker, generated/applied classes, downloaded a PDF, and recorded no browser or failed-resource errors.
- Mobile inspection at 390px viewport: document width was 390px. The timetable scrolls inside its container, and the official logo remains in the header.
- Actual generated PDF pages were rendered and inspected. Normal sample data produced five pages; a deliberately long multilingual note produced six, with the content flowing to a continuation page and slot headers repeating. Latin, Greek, and Cyrillic glyph availability was checked in the bundled Roboto font and visually inspected in the PDF.
- Excel was generated and round-tripped. Tests verify literal formula-like strings, room IDs independent of display names, full text retained across printable continuation rows, and bounded row heights. An interactive spreadsheet viewer was unavailable, so physical spreadsheet print output was not visually checked.

The build reports large lazy export-library chunks and harmless third-party comment-annotation warnings. The PDF/font/Excel libraries are loaded on demand rather than in the initial application bundle.

## Independent review and fixes

A fresh reviewer inspected the source against the design and implementation plan. No Critical findings were reported. All five Important findings were reproduced and fixed:

1. Partially locked groups now allocate session IDs without colliding with retained sessions.
2. Unchanged subject submissions preserve classes and attendance. Structural changes show a concrete impact review before applying, and destructive mutations retain a recovery snapshot.
3. Drafts carry a base revision and are scoped by project and tab. Taking over newer work refreshes mounted forms; older dirty drafts require an explicit choice. Stale whole-project mutations are rejected.
4. Excel wraps text conservatively and splits oversized cells into continuation rows instead of clipping fixed-height rows.
5. Generation returns a structured before/after diff covering placements, membership groups, additions/removals, teachers, and affected notes. The preview displays it before replacement.

The reviewer also identified catalog name correction as Minor. It was treated as a required data-entry correction: existing subject names can now be corrected without changing their stable catalog ID or disrupting their scheduled attendance; a browser regression verifies the shared name update.

An initial browser test for queued saves relied on modifying a dynamically imported development module. Vite's versioned module identities made that instrumentation unreliable. It was replaced by a deterministic test of the real Autosaver coordinator with a real IndexedDB store and explicitly gated writes; production uses that same coordinator.

## Decisions and practical limits

- Work was built in the new workspace on `feat/university-timetable`. There was no previous repository/base branch or remote to merge into. Keep this branch for review and university repository setup.
- Windows lacks `cmd.exe` in the execution environment. Dependency shell hooks and Unix skill helper scripts were bypassed; build tools and tests were invoked directly. The repository retains standard npm scripts for ordinary environments.
- Initial sandboxed Git writes were denied; local commit uses the approved escalation path. No repository, remote, or deployment was created on an external service.
- Scheduling is bounded search. The 360-session stress fixture has only 300 room-slot positions. Individual 1.8-second runs placed 271â€“300 sessions depending on concurrent machine load, with no newly generated teacher, room, or group clashes. Partial results and search-budget limits are reported, not represented as proof of infeasibility.
- The PDF font supports Latin, Greek, and Cyrillic. Additional scripts need licensed font assets and validation; universal script support is not claimed.
- Cross-tab protection uses Web Locks. For browsers without it, use a single tab; the README identifies this limitation.
- Browser-local storage is tied to the browser profile and site origin. Shared access, authentication, student enrollment and capacity-based allocation remain outside this release as agreed.
- GitHub Pages publication cannot be verified until the university's destination repository/account is selected. The workflow and deployment instructions are ready.

No unresolved Critical or Important review finding remains. There are no deferred Minor review findings.

## Manual break placement update — 2026-11-14

Classes can be edited or moved into break slots, including drag and click-to-move. Ordinary availability and clash checks still apply. Automatic generation continues to avoid breaks for new placements and retains locked manual break placements.

An entirely empty break column merges across room rows and displays a vertical Break label. Occupied break columns use normal editable cells. Emptiness is checked across the full day's timetable, including classes hidden by filters. PDF and Excel exports follow the same rule.

Validation: TypeScript passed, all 29 unit/integration tests and 16 browser workflows passed, and the production build passed. Review found no material regression. Rendered PDF pages 1 and 2 were inspected: the merged column spans room rows and page continuation without internal room borders, and the long note continues legibly.

## Eligible teacher dropdown — 2026-11-14

Teacher details retain the existing multiple-subject checkbox picker. The class editor now lists only teachers whose eligible subjects include the selected teaching group's subject. Changing groups preserves an eligible selection and clears an ineligible selection. An empty list explains that teacher details need updating; saving requires an eligible selection. This does not change manual availability/clash warnings.

The new browser regression checks the exact teacher lists for English, Management and Mathematics, including retaining a teacher eligible for multiple subjects and clearing an incompatible selection.
Validation: TypeScript, all 29 unit/integration tests, all 17 browser workflows, and the production build passed.


## Issue navigation and sample generation guidance (2026-11-14)

Setup badges now open the exact subject offering for unscheduled requirements. Scheduled class-count badges and existing Open class actions open the relevant day, clear timetable filters, scroll to and outline the class, and open its editor. Sample loading remains setup-only; the confirmation and empty schedule now explain Generate, Review, Apply. The sample generation/apply flow was verified working.

TypeScript, all 30 unit/integration tests, all 20 browser workflows, and the production build passed. The new issue-navigation regression failed before implementation, then passed.


## Saved timetable alternatives (2026-11-14)

Once a timetable exists, Create new timetable generates a named alternative from a copy of the current setup. Review and Apply create the alternative atomically; cancelling leaves the current schedule unchanged. Active timetable switches between independently saved setup, sessions, notes and locks. All alternatives share the workspace autosave/ownership/revision safeguards and are included in JSON backups. PDF/Excel export the active timetable and include its name. Older backups remain supported.

Review identified unstable draft identities for the original timetable and class forms. Stable timetable/session keys, revision-based draft review, legacy class-draft migration and missing-group/lock guards address this. Browser regressions cover saved notes/locks, cancellation, switching, reload, actual backup download, unfinished setup/class drafts after switching, and previous-version draft migration. No material review findings remain.

Final validation: TypeScript, all 32 unit/integration tests, all 23 browser workflows, and production build passed. Inspected desktop/mobile selector layouts with no horizontal page overflow. One export unit test initially exceeded its timeout during concurrent build/browser load; the complete unit suite passed when rerun alone (including that export test).


## Saved timetable storage and deletion (2026-11-14)

Saved timetables now lists each stored version with its name, term, class count, active status, View and Delete actions. Applying regeneration retains the previous generated version automatically. Deletion requires confirmation, supports Undo and archives a recovery snapshot. Active deletion opens another retained timetable; deleting the final schedule keeps setup data.

Review exposed two recovery edge cases with shared record IDs and delete-then-view operations. Timetable identity removal now triggers archival, while ordinary switching does not overwrite deletion recovery. A browser regression verifies the actual IndexedDB recovery entry after deletion and switching. Final review found no remaining material findings.

Final checks passed: TypeScript, all 34 unit/integration tests, all 25 browser workflows and production build. Desktop/mobile storage-list layouts were inspected. After interruption the preview server was absent; the first browser rerun failed on connection refusal. The server was restarted using the approved execution fallback after a sandbox Windows logon error, and the full browser suite then passed.
