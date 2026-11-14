# UOR Timetable Studio

University of Rawalpindi's browser-based timetable planning workspace. Uses the supplied university logo, navy `#0C1460`, and red `#D71D20`.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. If Windows blocks `npm.ps1`, use `npm.cmd`. In a restricted environment without `cmd.exe`, install dependencies with `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" install --ignore-scripts`, then start with `node node_modules/vite/bin/vite.js --host 127.0.0.1`.

## Prepare a timetable

1. Open the application directly into Dashboard. Use its setup shortcuts or the sidebar; no project-start screen is required. Optional fictional sample data is available under **Settings → Workspace data → Load sample data**, with replacement confirmation. Sample loading supplies setup records; click Generate timetable, review the result, and Apply timetable to populate the grid.
2. Set teaching days, semesters, time slots/breaks, room types, and combining limits in Settings. The supplied defaults are editable examples, not university policy.
3. Add departments and select their semesters (multiple selections are allowed). The last saved semester selection is reused for the next department. Under Subjects, select a semester and enter each department's subject offerings, weekly class count, and required room type. Reusing a university-wide subject code reuses the catalog subject.
4. Review automatically detected Shared subjects. Enable combining only where permitted and set maximum groups if needed.
5. Add teachers, select eligible subjects from the searchable department-semester categories, and set availability. Add rooms with types and availability.
6. Generate, review the proposed assignments and workload changes, then apply. Incomplete results explain unplaced requirements. Locks are preserved.
7. Click a class to edit or lock it. Drag to move or swap, or use Move / swap and select a target cell. Manual conflicts are allowed and highlighted in light red with warning icons and a separate issues list. In Clashes & issues, Open class or a class-count button opens and highlights the affected timetable cell. Setup buttons open the relevant unscheduled subject offering.
8. Filter by department, semester, or both. Export the current filter or full university to PDF or Excel.

Combined classes appear once and retain all attending groups. Their teacher workload counts once per session. Different groups can have the same teacher at different times. Room type and availability determine suitability; student counts and room capacity are intentionally excluded.

## Saving and backups

Applied edits save automatically to IndexedDB. Unfinished forms have local drafts, scoped to the project and tab. Reopening automatically restores the saved workspace and last selected view. Older drafts require review when newer changes exist. Settings contains Import backup, Restore previous snapshot, Load sample data, and Reset workspace; replacing/resetting data retains a recovery snapshot. Undo/redo is available during the current session.

Data belongs to the browser profile and website origin. Other computers do not see it. Clearing site data, private browsing, or changing the hosting URL may remove access to saved work. Download JSON backups regularly and use Import backup to move work. PDFs and spreadsheets cannot be imported as projects. Backups contain university scheduling data and should be handled accordingly.

Only one tab can edit at once in browsers supporting the Web Locks API; another tab can explicitly take over. Use a current Chrome, Edge, Firefox, or Safari browser over localhost or HTTPS. Browsers without Web Locks cannot provide the same cross-tab protection; use one tab.

Saving indicators reflect completed database writes. Closing during an unfinished write or a power failure may lose the latest edit. Storage errors are reported; export a backup if saving fails.

## Generation behavior and limits

The scheduler runs in a Web Worker and considers alternative combinations, eligible teachers, availability, room type, clashes, and locks. It prefers separate days and balanced weekly workloads. Combined groups require matching subject codes, weekly counts, and room types. Session timings always use configured slots: a note such as “2-hour lab” is display-only.

Generation has a bounded search budget and can be cancelled. A partial result or timeout is not a proof that no complete timetable exists. Review diagnostics and adjust inputs. A 360-session synthetic stress case with 12 rooms and 25 teaching slots has at most 300 room-slot positions before any other constraints; see test output for measured results. Do not assume a particular runtime for every university dataset.

PDFs use selectable, embedded-font vector text, branded headings, repeated slot headers, and automatic overflow pages. Large numbers of slots are divided into blocks to maintain readability. The bundled Roboto font supports Latin, Greek, and Cyrillic text; additional script support needs corresponding licensed font assets and export validation. Excel includes timetable sheets, structured Classes, and Issues, with user strings stored as text.

## Development checks

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run build
```

For an existing compatible browser in a restricted environment, set `PLAYWRIGHT_EXECUTABLE` to its executable. If starting Vite separately, set `EXTERNAL_SERVER=1`. Equivalent direct commands are `node node_modules/vitest/vitest.mjs run`, `node node_modules/typescript/bin/tsc --noEmit`, and `node node_modules/vite/bin/vite.js build`.

## GitHub Pages

The university should control the GitHub organization, repository, and deployment settings. Push the reviewed code to that repository's `main` branch and select **Settings → Pages → Source → GitHub Actions**. The included workflow verifies, tests, builds, and deploys static assets; it handles repository subpaths and `*.github.io` root repositories. Custom domains may need a `/` base override. No repository or remote deployment has been created automatically.

Entered project data is never committed or uploaded by the application. No credentials, server, or login are needed for this release. Shared storage, authentication, and live collaboration require future backend work.

## Source and ownership

The university logo is supplied by the project owner and is not licensed for unrelated reuse. No open-source license is imposed on the university's application code. Third-party dependencies retain their own licenses: React/Vite/ExcelJS/pdfmake use MIT; bundled fonts retain their accompanying licenses. See `THIRD_PARTY.md` and the lockfile for the dependency inventory.

Design and execution documents are in `docs/superpowers/`.
