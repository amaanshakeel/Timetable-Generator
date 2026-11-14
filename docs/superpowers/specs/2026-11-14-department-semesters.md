# Department semester membership

A department may belong to several semesters. New department forms offer semester checkboxes and reuse the last successfully saved selection, scoped to the current workspace. Department rows display actual semester labels. Subject entry lists only departments available in its selected semester and clears incompatible selections on semester changes.

Store an optional `semesters` array on departments. Existing projects without this field retain their current availability in all configured semesters, so old backups and schedules remain compatible. Explicit memberships are validated; a department cannot remove a semester while it has subject offerings there. Reducing the configured semester count trims memberships alongside the existing reviewed offering cleanup.

Implementation: add compatible model/validation and membership helper; update department editor, remembered preferences, table, and subject selectors; verify new entry/re-entry, reload persistence, filtering, legacy imports, and existing browser workflows.
