import { openDB } from "idb";
import type { Project } from "../domain/types";
import { validateProject } from "../domain/validation";
export interface CloudJob {
  key: string;
  id: string;
  ownerId: string;
  deviceId: string;
  deviceName: string;
  snapshot: Project;
  createdAt: string;
}
export class CloudOutbox {
  private db;
  constructor(name = "uor-cloud-backups-v1") {
    this.db = openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("outbox", { keyPath: "key" });
        db.createObjectStore("meta");
      },
    });
  }
  async device() {
    const db = await this.db;
    const tx = db.transaction("meta", "readwrite");
    let device = (await tx.store.get("device")) as
      { id: string; name: string } | undefined;
    if (!device) {
      const id = crypto.randomUUID();
      device = { id, name: `Browser ${id.slice(0, 6)}` };
      await tx.store.put(device, "device");
    }
    await tx.done;
    return device;
  }
  async nameDevice(name: string) {
    const device = {
      ...(await this.device()),
      name: name.trim().slice(0, 100) || "This browser",
    };
    await (await this.db).put("meta", device, "device");
    return device;
  }
  async put(
    ownerId: string,
    deviceId: string,
    deviceName: string,
    snapshot: Project,
  ): Promise<CloudJob> {
    const valid = validateProject(snapshot);
    if (!valid.ok) throw Error(valid.error);
    const key = JSON.stringify([ownerId, deviceId, snapshot.id]);
    const db = await this.db;
    const tx = db.transaction("outbox", "readwrite");
    const existing = (await tx.store.get(key)) as CloudJob | undefined;
    if (
      existing &&
      (existing.snapshot.revision > snapshot.revision ||
        (existing.snapshot.revision === snapshot.revision &&
          existing.snapshot.savedAt === snapshot.savedAt))
    ) {
      await tx.done;
      return existing;
    }
    const job: CloudJob = {
      key,
      id: crypto.randomUUID(),
      ownerId,
      deviceId,
      deviceName,
      snapshot: valid.value,
      createdAt: new Date().toISOString(),
    };
    await tx.store.put(job);
    await tx.done;
    return job;
  }
  async list(ownerId: string): Promise<CloudJob[]> {
    return ((await (await this.db).getAll("outbox")) as CloudJob[])
      .filter((j) => j.ownerId === ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async acknowledge(job: CloudJob) {
    const db = await this.db;
    const tx = db.transaction("outbox", "readwrite");
    const current = (await tx.store.get(job.key)) as CloudJob | undefined;
    if (current?.id === job.id) await tx.store.delete(job.key);
    await tx.done;
  }
}
