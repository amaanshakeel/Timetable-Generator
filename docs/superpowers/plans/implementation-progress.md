# Execution ledger — 2026-11-13-university-timetable

Plan: docs/superpowers/plans/2026-11-13-university-timetable.md

Ruling: This is a new non-repository workspace, so initialize a dedicated feature branch in place; there is no existing branch needing worktree isolation.
Ruling: Use node with the installed npm CLI directly because npm.cmd cannot launch in this environment. This changes commands only, not product behavior.
Pre-flight: Tasks share Project, TeachingGroup, Session, storage revisions, and worker run IDs. Keep these definitions in src/domain/types.ts; exports and filtered UI consume the same selectors.
Pre-flight: Setup removal must preserve valid references or explicitly archive/remove impacted placements. A worker result may be applied only to its original input revision.
Task 1: started.
Task 1: implemented and verified — validation, global issues, typed domain, move/swap invariants; baseline RED missing domain module, then GREEN.
Task 2: implemented and verified — IndexedDB round trips, archival replacement, stale-write rejection, invalid imports, browser recovery, pending-save sequencing, two-tab takeover; unfinished drafts isolated by project.
Task 3: implemented and verified — complete staff-entered project browser flow, semester-first offerings, categorized eligibility, all/custom availability, editable settings and room types, university logo and responsive layout.
Task 4: implemented and verified — seven focused scheduler cases and a 360-session stress dataset. Stress measurement: 300 scheduled, 60 unplaced, 1800 ms at a 1800 ms budget. The fixture has only 300 room-slot positions.
Task 5: implemented and verified — atomic drag swap, lock preservation after regeneration, manual conflict warnings, issue-to-class navigation, filtered shared membership, optional note recovery.
Task 6: implemented and verified — actual PDF/XLSX browser downloads, workbook round trips, formula-like literal strings, stable room ID mapping, rendered PDF visually inspected with five pages for five days.
Ruling: Native local execution uses Windows PowerShell commands instead of the skills' Unix helper scripts. Progress is recorded here because the helper shell is unavailable; evidence is in tests and versioned source.
Ruling: Use the bundled Roboto export font for Latin, Greek, and Cyrillic. Additional scripts need licensed fonts and validation; this scope limit is documented rather than silently promising universal font support.
Ruling: Dependency installation skips shell hooks because cmd.exe is unavailable. Vite, esbuild, TypeScript, Vitest and Playwright were exercised directly afterward.
Ruling: Initial per-task commits could not write .git/index.lock within the sandbox. Consolidate the verified implementation into a local commit using the approved escalation path; no remote writes.
Task 7: ongoing — final fresh review, complete checks, repository-subpath production check, documentation and local commit remain.
Final review: fresh independent reviewer completed. No Critical findings; five Important findings reproduced and fixed in one regression-tested pass.
Final: fixed duplicate IDs when finishing a partially locked group — scheduler regression RED→GREEN.
Final: fixed unchanged offering saves removing attendance — browser regression RED→GREEN; actual structural changes require impact review and archive a recovery snapshot.
Final: fixed stale drafts after takeover — browser regression RED→GREEN; explicit draft resolution, form refresh, and stale-revision rejection.
Final: fixed wrapped Excel clipping — long-cell continuation-row regression RED→GREEN, with original text preserved.
Final: fixed incomplete generation preview — placement/membership diff regression RED→GREEN and structured preview rendered.
Final: Ruling: catalog renaming was regraded from Minor to a required data-entry correction; preserve catalog IDs and update shared names, with browser verification. Leaving this unsupported would prevent correcting ordinary input errors.
Final: Ruling: replace brittle Vite module-patching browser instrumentation with a real Autosaver coordinator and deterministic gated-write IndexedDB test. This keeps the pending-save contract covered independently of development module URL caching.
Final: Ruling: review set universal fonts, global optimality, and browsers without Web Locks aside because their explicit limits are accepted and documented. Preserve those limits; assuming broader support would risk missing glyphs, incomplete scheduling, or cross-tab overwrites.
Final: Ruling: printed PDF quality is established by rendered-page inspection here; actual spreadsheet viewer/physical print inspection remains unavailable. Workbook structure, preserved text, and bounded row heights are verified, but a university print check is still appropriate.
Final: Ruling: this new repository has no base branch or remote, so keep the development branch in place instead of offering an inapplicable merge/push menu. Publishing remains pending the university's destination.
Final verification: TypeScript passed; 26 unit/integration tests passed; all 11 browser workflows passed; production build and repository-subpath browser check passed. Details in docs/VERIFICATION.md.
Task 7: complete — source saved in local commit 56ac473; no remote configured or published. Development preview remains available at http://127.0.0.1:5173. The plan's per-task checkpoints were consolidated as recorded above; this ledger and docs/VERIFICATION.md are the executed-work record.
