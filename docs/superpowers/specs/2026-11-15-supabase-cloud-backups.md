# Supabase cloud backups - implemented first stage

Scope: automatic private cloud backups of the existing browser-local workspace, including all saved timetables. Shared editing and realtime synchronization remain a later stage. Existing IndexedDB autosave and JSON export continue to work independently of the network.

Design:
- Save locally first, then upload versioned immutable Project snapshots after a short debounce. Store a durable pending upload so a reload or temporary disconnection does not discard the latest unsent revision.
- Keep each browser/device workspace separate. The same staff account can list and recover its backups from another computer; recovery is an explicit reviewed import, not background synchronization.
- Use Supabase Auth for recoverable backup ownership, with optional email sign-in limited to cloud backups as approved. RLS restricts backup rows to their owner. Public frontend configuration contains only the project URL and publishable key; elevated keys stay out of the app.
- List prior versions with device/workspace labels and server timestamps. Validate downloaded snapshots using validateProject before offering restoration; preserve the local recovery snapshot before replacement.
- Display local-save status separately from cloud-backup status. Retry transient failures with backoff; do not claim cloud success until the server acknowledges the saved snapshot.
- Verify owner isolation, signed-out rejection, idempotent retries, offline/reload recovery, account switching and restore before deployment.

Confirmed: optional email sign-in approved; user supplied project xdisgkoelkxzrbnpjybx, manually installed schema and configured redirect URLs. Actual upload, history and restore preview were user-verified. Production SMTP for wider staff remains an administrator setup step. Live management/advisor and two-account checks were unavailable to the connected account. See docs/SUPABASE_SETUP.md.
