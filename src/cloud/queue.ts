import { CloudOutbox, type CloudJob } from "./outbox";
export interface UploadStatus {
  ownerId: string;
  state: "uploading" | "saved" | "error";
  message?: string;
  savedAt?: string;
  workspaceId?: string;
  revision?: number;
  workspaceSavedAt?: string;
}
export class CloudBackupQueue {
  private owner: string | null = null;
  private running: Promise<void> | null = null;
  private requested = false;
  constructor(
    private store: CloudOutbox,
    private send: (job: CloudJob) => Promise<void>,
    private status: (s: UploadStatus) => void,
  ) {}
  setOwner(owner: string | null) {
    this.owner = owner;
  }
  flush(): Promise<void> {
    if (this.running) {
      this.requested = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.requested) {
        this.requested = false;
        return this.flush();
      }
    });
    return this.running;
  }
  private async run() {
    const attempted = new Set<string>();
    const failures = new Map<string, string>();
    while (this.owner) {
      const ownerId = this.owner;
      let jobs: CloudJob[];
      try {
        jobs = await this.store.list(ownerId);
      } catch (error) {
        if (this.owner === ownerId)
          this.status({
            ownerId,
            state: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not read pending backups.",
          });
        return;
      }
      if (this.owner !== ownerId) continue;
      const job = jobs.find((j) => !attempted.has(j.id));
      if (!job) {
        const blocked = jobs.find((j) => failures.has(j.id));
        if (blocked)
          this.status({
            ownerId,
            state: "error",
            message: failures.get(blocked.id),
          });
        return;
      }
      attempted.add(job.id);
      this.status({ ownerId, state: "uploading" });
      try {
        await this.send(job);
        await this.store.acknowledge(job);
        if (this.owner === ownerId)
          this.status({
            ownerId,
            state: "saved",
            savedAt: new Date().toISOString(),
            workspaceId: job.snapshot.id,
            revision: job.snapshot.revision,
            workspaceSavedAt: job.snapshot.savedAt,
          });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Cloud backup failed. Local data is still saved.";
        failures.set(job.id, message);
        if (this.owner === ownerId)
          this.status({ ownerId, state: "error", message });
        // Retain this job, but do not let one invalid workspace block other backups.
      }
    }
  }
}
