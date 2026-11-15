# Supabase backup implementation plan

Scope: optional email sign-in enables versioned private cloud backup; local use remains unauthenticated and autosaves first. No realtime or shared editing. Each owner/device/workspace has separate backup history; all saved timetables travel together in a validated Project snapshot.

1. Add a persistent IndexedDB cloud outbox and a serial retry queue. Test coalescing, idempotency, failures, latest-ack isolation and account switching before implementing transport.
2. Add a pinned Supabase browser client adapter using only configured URL/publishable key. Optional email magic-link login, auth-scoped RPC uploads, list metadata, validated download for explicit restore. Never clear local state on login/logout.
3. Prepare owner-scoped RLS schema and a security-invoker backup RPC. Server timestamps, immutable version payloads, idempotent upload IDs, identity checks, bounded recent/daily retention. Live deployment waits for the user to identify the owning organization/project.
4. Add Cloud backups in Settings, with opt-in automatic upload, backup-now, retry status, version listing and review-before-restore. Show cloud status separately from local autosave. Wire public GitHub Actions variables without embedding secrets.
5. Verify queue/storage behavior, app type/unit/browser/build checks; once a project is selected, inspect tables, deploy schema, check advisors, verify cross-owner and signed-out rejection and actual upload/download. Configure production email delivery and authorized return URL before claiming hosted backups are active.

Implemented and reviewed. User installed schema in their supplied project and verified live upload/history/restore preview. Anonymous table access denied; live two-account/advisor checks unavailable. Wider staff email needs production SMTP. See docs/SUPABASE_SETUP.md for deployment and recovery instructions.
