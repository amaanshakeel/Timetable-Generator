import { openDB, type IDBPDatabase } from "idb";
import type { Project } from "../domain/types";
import { validateProject, type ValidationResult } from "../domain/validation";
export class ProjectStore {
  private db: Promise<IDBPDatabase>;
  constructor(name = "uor-timetable-v1") {
    this.db = openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("projects");
      },
    });
  }
  async load(): Promise<Project | null> {
    return (await (await this.db).get("projects", "current")) || null;
  }
  async save(p: Project) {
    const db = await this.db;
    const tx = db.transaction("projects", "readwrite");
    const current = await tx.store.get("current");
    if (current && current.revision > p.revision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw Error("Newer changes are already saved. Reload to continue.");
    }
    await tx.store.put(p, "current");
    await tx.done;
  }
  async archiveAndReplace(p: Project) {
    const db = await this.db;
    const tx = db.transaction("projects", "readwrite");
    const old = await tx.store.get("current");
    if (old) await tx.store.put(old, "recovery");
    await tx.store.put(p, "current");
    await tx.done;
  }
  async loadRecovery(): Promise<Project | null> {
    return (await (await this.db).get("projects", "recovery")) || null;
  }
}
export function parseBackup(text: string): ValidationResult<Project> {
  try {
    return validateProject(JSON.parse(text));
  } catch {
    return { ok: false, error: "This file is not a valid JSON backup" };
  }
}
