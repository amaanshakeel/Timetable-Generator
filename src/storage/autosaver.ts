import type { Project } from "../domain/types";
export class Autosaver {
  private queue: Promise<void> = Promise.resolve();
  private sequence = 0;
  constructor(
    private writer: {
      save: (p: Project) => Promise<void>;
      archiveAndReplace: (p: Project) => Promise<void>;
    },
    private status: (s: string) => void,
    private error: (message: string) => void,
  ) {}
  enqueue(p: Project, replace = false) {
    const sequence = ++this.sequence;
    this.status("Saving…");
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        try {
          if (replace) await this.writer.archiveAndReplace(p);
          else await this.writer.save(p);
          if (sequence === this.sequence) this.status("All changes saved");
        } catch (e) {
          if (sequence === this.sequence) this.status("Save failed");
          this.error(e instanceof Error ? e.message : "Could not save work");
        }
      });
  }
  drain() {
    return this.queue;
  }
}
