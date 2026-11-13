import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { ProjectStore, parseBackup } from "../../src/storage/projectStore";
import { fixture } from "../fixture";
it("persists complete work and archives before replacement", async () => {
  const store = new ProjectStore("test-" + crypto.randomUUID());
  const p = fixture();
  p.sessions[0].locked = true;
  await store.save(p);
  expect((await store.load())?.sessions[0].note).toBe("2-hour lab");
  expect((await store.load())?.sessions[0].locked).toBe(true);
  const newer = fixture();
  newer.sessions = [];
  await store.archiveAndReplace(newer);
  expect((await store.loadRecovery())?.sessions).toHaveLength(2);
  expect((await store.load())?.sessions).toHaveLength(0);
});
it("rejects stale writes and bad backups without touching saved state", async () => {
  const store = new ProjectStore("test-" + crypto.randomUUID());
  const p = fixture();
  p.revision = 5;
  await store.save(p);
  await expect(store.save({ ...p, revision: 4 })).rejects.toThrow(/newer/i);
  expect(parseBackup("{oops").ok).toBe(false);
  expect(parseBackup(JSON.stringify({ ...p, schemaVersion: 12 })).ok).toBe(
    false,
  );
  expect((await store.load())?.revision).toBe(5);
});
