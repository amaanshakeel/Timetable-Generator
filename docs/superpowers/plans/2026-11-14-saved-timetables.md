# Saved timetables implementation plan

User decision: keep the old timetable and switch between alternatives. A new timetable starts with a copy of the current setup, while each alternative preserves its own settings, catalog, teachers, rooms, availability, sessions, notes, and locks. Generation must be reviewed before the new alternative is created. Cancelling leaves existing work unchanged.

Use the existing workspace autosave/ownership/revision queue for all alternatives. Add optional active timetable ID/name and inactive timetable snapshots to Project; snapshots contain setup and schedule data without nested snapshots. Keep schema version 1 compatible by making new fields optional and validating every saved snapshot and its references. Backups include all alternatives. Exports and conflict checks use the active timetable only.

1. Add domain tests for creating/switching, independent edits/locks, validation of saved snapshots and old backups. Observe failures, implement snapshot helpers and compatible schema.
2. Add a timetable selector and Create new timetable action in the timetable view; expose the same action on Dashboard once a schedule exists. Ask for a name and explain setup copying and independent locks/notes. Use the worker with an empty schedule for new alternatives, retain existing regeneration for the active timetable. Preview and Apply create the new alternative atomically.
3. Reset form mounts and timetable filters on switching. Preserve autosave, undo and stale-generation checks through the existing update path. Show active timetable name in export titles.
4. Add browser coverage for create/cancel/apply, switch and reload, note/lock preservation and backup roundtrip. Run TypeScript, unit tests, browser suite and production build; inspect the selector layout.
