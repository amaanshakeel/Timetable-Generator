import { openDB } from "idb";
import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { fixture } from "../fixture";
import { CloudOutbox } from "../../src/cloud/outbox";
import { CloudBackupQueue } from "../../src/cloud/queue";

it("keeps the latest pending revision across reload and isolates owners", async () => {
  const name = "cloud-test-" + crypto.randomUUID();
  const store = new CloudOutbox(name);
  const p = fixture();
  await store.put("owner-a", "device-1", "Office", p);
  await store.put("owner-a", "device-1", "Office", {
    ...p,
    revision: p.revision + 1,
  });
  await store.put("owner-b", "device-1", "Office", p);
  const restored = new CloudOutbox(name);
  expect(await restored.list("owner-a")).toHaveLength(1);
  expect((await restored.list("owner-a"))[0].snapshot.revision).toBe(
    p.revision + 1,
  );
  expect(await restored.list("owner-b")).toHaveLength(1);
});
it("retains a failed upload with its idempotency ID until a successful retry", async () => {
  const store = new CloudOutbox("cloud-test-" + crypto.randomUUID());
  const job = await store.put("owner-a", "device-1", "Office", fixture());
  let fail = true;
  const ids: string[] = [];
  const queue = new CloudBackupQueue(
    store,
    async (j) => {
      ids.push(j.id);
      if (fail) throw Error("Offline");
    },
    () => {},
  );
  queue.setOwner("owner-a");
  await queue.flush();
  expect(await store.list("owner-a")).toHaveLength(1);
  fail = false;
  await queue.flush();
  expect(ids).toEqual([job.id, job.id]);
  expect(await store.list("owner-a")).toHaveLength(0);
});
it("does not delete a newer pending job when an older upload finishes", async () => {
  const store = new CloudOutbox("cloud-test-" + crypto.randomUUID());
  const p = fixture();
  await store.put("owner-a", "device-1", "Office", p);
  let finish!: () => void;
  let uploads = 0;
  let notifyStarted!: () => void;
  const sendStarted = new Promise<void>((resolve) => (notifyStarted = resolve));
  const started = new Promise<void>((resolve) => (finish = resolve));
  const queue = new CloudBackupQueue(
    store,
    async () => {
      uploads++;
      if (uploads === 1) {
        notifyStarted();
        await started;
      }
    },
    () => {},
  );
  queue.setOwner("owner-a");
  const running = queue.flush();
  await sendStarted;
  await store.put("owner-a", "device-1", "Office", {
    ...p,
    revision: p.revision + 1,
  });
  finish();
  await running;
  expect(uploads).toBe(2);
  expect(await store.list("owner-a")).toHaveLength(0);
});
it("does not upload another owner's pending work after account switching", async () => {
  const store = new CloudOutbox("cloud-test-" + crypto.randomUUID());
  await store.put("owner-a", "device-1", "Office", fixture());
  const sent: string[] = [];
  const queue = new CloudBackupQueue(
    store,
    async (j) => {
      sent.push(j.ownerId);
    },
    () => {},
  );
  queue.setOwner("owner-b");
  await queue.flush();
  expect(sent).toEqual([]);
  expect(await store.list("owner-a")).toHaveLength(1);
});

it("does not replace a newer pending snapshot with a delayed older revision", async () => {
  const store = new CloudOutbox("cloud-test-" + crypto.randomUUID());
  const p = fixture();
  await store.put("owner-a", "device-1", "Office", {
    ...p,
    revision: 12,
    savedAt: "2026-11-15T10:00:00Z",
  });
  await store.put("owner-a", "device-1", "Office", {
    ...p,
    revision: 11,
    savedAt: "2026-11-15T09:59:00Z",
  });
  expect((await store.list("owner-a"))[0].snapshot.revision).toBe(12);
});

it("does not let an older failing workspace block a valid newer backup", async () => {
  const name = "cloud-test-" + crypto.randomUUID();
  const store = new CloudOutbox(name);
  const bad = await store.put("owner-a", "device-1", "Office", fixture());
  const db = await openDB(name);
  await db.put("outbox", { ...bad, createdAt: "2000-01-01T00:00:00Z" });
  db.close();
  const good = await store.put("owner-a", "device-1", "Office", fixture());
  const sent: string[] = [];
  const queue = new CloudBackupQueue(
    store,
    async (j) => {
      sent.push(j.id);
      if (j.id === bad.id) throw Error("Workspace too large");
    },
    () => {},
  );
  queue.setOwner("owner-a");
  await queue.flush();
  expect(sent).toEqual([bad.id, good.id]);
  expect((await store.list("owner-a")).map((j) => j.id)).toEqual([bad.id]);
});
