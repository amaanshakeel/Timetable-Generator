import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { Autosaver } from "../../src/storage/autosaver";
import { ProjectStore } from "../../src/storage/projectStore";
import { fixture } from "../fixture";
it("does not report saved while a newer queued write is still pending", async () => {
  const store = new ProjectStore("queued-" + crypto.randomUUID());
  let releaseFirst!: () => void, releaseSecond!: () => void;
  const first = new Promise<void>((r) => (releaseFirst = r)),
    second = new Promise<void>((r) => (releaseSecond = r));
  let n = 0;
  const writer = {
    save: async (p: ReturnType<typeof fixture>) => {
      await (++n === 1 ? first : second);
      await store.save(p);
    },
    archiveAndReplace: (p: ReturnType<typeof fixture>) =>
      store.archiveAndReplace(p),
  };
  const statuses: string[] = [];
  const saver = new Autosaver(
    writer,
    (s) => statuses.push(s),
    () => {},
  );
  const p = fixture();
  saver.enqueue({ ...p, revision: 1 });
  saver.enqueue({ ...p, revision: 2 });
  releaseFirst();
  await new Promise((r) => setTimeout(r, 10));
  expect(statuses.at(-1)).toBe("Saving…");
  releaseSecond();
  await saver.drain();
  expect(statuses.at(-1)).toBe("All changes saved");
  expect((await store.load())?.revision).toBe(2);
});
