import { useEffect, useState } from "react";
import type { Project } from "../domain/types";
import type { CloudBackupsState } from "./useCloudBackups";
export function CloudBackupPanel({
  cloud,
  readOnly,
  onRestore,
}: {
  cloud: CloudBackupsState;
  readOnly: boolean;
  onRestore: (p: Project) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState(cloud.device?.name || "This browser");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (cloud.device) setName(cloud.device.name);
  }, [cloud.device?.name]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The cloud request could not finish.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel cloud-backup-panel">
      <h2>Cloud backups</h2>
      <p className="muted small">
        Private online recovery copies, including every saved timetable. Other
        computers stay separate until you choose a backup to restore.
      </p>
      {!cloud.configured ? (
        <p className="notice">
          Cloud backups are not connected yet. Your work continues to save in
          this browser.
        </p>
      ) : !cloud.user ? (
        <>
          <p className="small">
            Sign in with your staff email to back up and recover your work.
            Timetable editing does not require a sign-in.
          </p>
          <form
            className="cloud-sign-in"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await cloud.signIn(email);
                setMessage(
                  "Check your email for the sign-in link. Local work can continue while you wait.",
                );
              });
            }}
          >
            <label>
              Backup email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <button className="btn primary" disabled={busy}>
              Send sign-in link
            </button>
          </form>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex-between">
            <p>
              Signed in as <strong>{cloud.user.email}</strong>
            </p>
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => void run(cloud.signOut)}
            >
              Sign out of backups
            </button>
          </div>
          <label className="cloud-enable">
            <input
              type="checkbox"
              checked={cloud.enabled}
              disabled={readOnly || busy}
              onChange={(e) => cloud.setAutomatic(e.target.checked)}
            />
            Automatically back up this browser's workspace
          </label>
          <p className="small muted">
            Your local save finishes first. Cloud uploads retry after a
            connection returns. Recent versions and daily recovery points remain
            available.
          </p>
          <form
            className="cloud-device-name"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => cloud.renameDevice(name));
            }}
          >
            <label>
              Computer label
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="btn secondary" disabled={busy}>
              Save label
            </button>
          </form>
          <p role="status" className="notice">
            {cloud.status === "error"
              ? "Cloud backup needs attention. Your local timetable remains saved."
              : !cloud.enabled
                ? "Automatic cloud backup is off."
                : cloud.status === "saved"
                  ? "Current cloud upload confirmed."
                  : cloud.status === "uploading"
                    ? "Uploading cloud backup..."
                    : "Cloud backup is pending."}
            {cloud.lastSaved
              ? ` Last confirmed: ${new Date(cloud.lastSaved).toLocaleString()}.`
              : ""}
          </p>
          <div className="filter-row">
            <button
              className="btn primary"
              disabled={busy || readOnly || cloud.status === "uploading"}
              onClick={() => void run(cloud.backupNow)}
            >
              Back up now
            </button>
            <button
              className="btn secondary"
              disabled={busy || cloud.busy}
              onClick={() => void cloud.refresh()}
            >
              Refresh backup history
            </button>
          </div>
          <div className="cloud-version-list">
            {cloud.versions.map((v) => (
              <article className="cloud-version" key={v.id}>
                <div>
                  <strong>{v.workspace_name}</strong>
                  <p className="small muted">
                    {v.device_name} - revision {v.revision} -{" "}
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  className="btn secondary"
                  disabled={busy || readOnly}
                  onClick={() =>
                    void run(async () => onRestore(await cloud.download(v.id)))
                  }
                >
                  Restore backup
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {(error || cloud.error) && (
        <p role="alert" className="notice error">
          {error || cloud.error}
        </p>
      )}
      <p className="small muted">
        Export backup remains available for a separate file copy.
      </p>
    </section>
  );
}
