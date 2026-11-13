# Implementation and verification record

Verified locally on 13 November 2026 using Node.js 24 and Chromium on Windows. The app is ready for local review; publishing to a university-owned repository remains a separate step.

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
- Scheduling is bounded search. The 360-session stress fixture has only 300 room-slot positions. Individual 1.8-second runs placed 271–300 sessions depending on concurrent machine load, with no newly generated teacher, room, or group clashes. Partial results and search-budget limits are reported, not represented as proof of infeasibility.
- The PDF font supports Latin, Greek, and Cyrillic. Additional scripts need licensed font assets and validation; universal script support is not claimed.
- Cross-tab protection uses Web Locks. For browsers without it, use a single tab; the README identifies this limitation.
- Browser-local storage is tied to the browser profile and site origin. Shared access, authentication, student enrollment and capacity-based allocation remain outside this release as agreed.
- GitHub Pages publication cannot be verified until the university's destination repository/account is selected. The workflow and deployment instructions are ready.

No unresolved Critical or Important review finding remains. There are no deferred Minor review findings.
