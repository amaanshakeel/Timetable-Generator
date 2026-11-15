# Private cloud backups

Local work remains accessible without login. Settings provides optional email sign-in, Back up now, automatic backup opt-in, computer labels, history and reviewed restoration. All saved timetables are included in each workspace snapshot. This is backup and recovery, not realtime collaboration.

## Configuration

1. Create or select the university-owned Supabase project. Run `supabase/schema.sql` in its SQL Editor. This bootstrap installs owner-scoped RLS and an invoker RPC. `supabase/verify.sql` provides optional read-only administrator assertions.
2. Copy `.env.example` to ignored `.env.local`; set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Only use a publishable browser key. Never put secret/service-role keys in frontend configuration.
3. Under Authentication > URL Configuration, set Site URL to https://amaanshakeel.github.io/Timetable-Generator/ and allow that redirect plus http://127.0.0.1:5173/ for local testing.
4. Set the same two public values as GitHub Actions repository variables. The Pages workflow builds them into the app. Rebuild after changing them.
5. Configure a production SMTP provider before inviting wider staff. Supabase's default mailer is intended for testing and restricts recipients. See https://supabase.com/docs/guides/auth/auth-smtp.

## Recovery and reliability

Sign in with the same email on another computer, refresh history and select Restore backup. Review the project before applying it; Cancel leaves local work unchanged. A local recovery snapshot is preserved before replacement. Signing out does not delete local data.

Local saving happens first. Automatic cloud snapshots are opt-in and debounced. Already-requested uploads remain in a durable browser outbox and retry while signed in, including after reload or reconnection even if future automatic backups are disabled. Pending uploads still require the original account and browser storage; clearing browser storage can lose unsent work. Keep exported JSON backups for independent recovery.

Backups are immutable and scoped to the signed-in owner. Retention is the latest 20 versions plus one daily version for the last 30 days, per account/device/workspace. Payloads are limited to 10 MB. History lists the newest 100 account versions. An older upload acknowledgment never marks newer edits as backed up.

## Installed project and validation

Project xdisgkoelkxzrbnpjybx is configured locally and in GitHub Actions variables. The administrator manually installed the schema and saved authentication URLs. The user confirmed actual sign-in, upload, history listing and downloaded restore review. An anonymous table request was denied. The connected management account cannot administer this project, so live two-account isolation tests and Supabase advisor checks were not run. RLS source and mocked account-isolation behavior were reviewed and tested.

Run `npm run check`, `npm run test:e2e`, `npm run test:cloud` and `npm run build`. Cloud browser tests use an isolated fake endpoint and never send real email or upload university data.
