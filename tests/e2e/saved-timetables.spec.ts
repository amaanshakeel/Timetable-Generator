import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test("creates another timetable with the same setup and switches without losing edits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Load sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replace with sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  const first = page.locator("[data-session]").first();
  const originalId = await first.getAttribute("data-session");
  await first.click();
  await page
    .getByLabel("Class note", { exact: true })
    .fill("Keep this original note");
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await page.locator(`[data-session="${originalId}"]`).click();
  await page.getByRole("button", { name: "Lock class", exact: true }).click();
  await page
    .getByRole("button", { name: "Create new timetable", exact: true })
    .click();
  await page
    .getByLabel("Timetable name", { exact: true })
    .fill("Alternative plan");
  await page
    .getByRole("button", { name: "Generate new timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep current timetable", exact: true })
    .click();
  await expect(
    page.getByLabel("Active timetable", { exact: true }),
  ).toHaveValue(/.+/);
  await expect(
    page.getByLabel("Active timetable", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Create new timetable", exact: true })
    .click();
  await page
    .getByLabel("Timetable name", { exact: true })
    .fill("Alternative plan");
  await page
    .getByRole("button", { name: "Generate new timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  const selector = page.getByLabel("Active timetable", { exact: true });
  await expect(selector.locator("option:checked")).toHaveText(
    "Alternative plan",
  );
  await expect(selector.locator("option")).toHaveCount(2);
  await expect(page.locator("[data-session]").first()).toBeVisible();
  await selector.selectOption({ label: "Timetable 1" });
  await page.locator(`[data-session="${originalId}"]`).click();
  await expect(page.getByLabel("Class note", { exact: true })).toHaveValue(
    "Keep this original note",
  );
  await expect(
    page.getByRole("button", { name: "Unlock class", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await selector.selectOption({ label: "Alternative plan" });
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(selector.locator("option:checked")).toHaveText(
    "Alternative plan",
  );
  await selector.selectOption({ label: "Timetable 1" });
  await expect(selector.locator("option")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const backup = await download;
  const contents = JSON.parse(await readFile((await backup.path())!, "utf-8"));
  expect(contents.timetableName).toBe("Timetable 1");
  expect(contents.savedTimetables).toHaveLength(1);
  expect(contents.savedTimetables[0].name).toBe("Alternative plan");
  expect(
    contents.sessions.some(
      (s: { note: string; locked: boolean }) =>
        s.note === "Keep this original note" && s.locked,
    ),
  ).toBe(true);
});

test("unfinished original setup and class drafts remain available after switching", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Load sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replace with sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  const id = await page
    .locator("[data-session]")
    .first()
    .getAttribute("data-session");
  await page.locator(`[data-session="${id}"]`).click();
  await page
    .getByLabel("Class note", { exact: true })
    .fill("Unfinished original class");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Teacher name", { exact: true })
    .fill("Unfinished original teacher");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page
    .getByRole("button", { name: "Create new timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate new timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  await page
    .getByLabel("Active timetable", { exact: true })
    .selectOption({ label: "Timetable 1" });
  await page.locator(`[data-session="${id}"]`).click();
  await page
    .getByRole("button", { name: "Restore draft for review", exact: true })
    .click();
  await expect(page.getByLabel("Class note", { exact: true })).toHaveValue(
    "Unfinished original class",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Restore draft for review", exact: true })
    .click();
  await expect(page.getByLabel("Teacher name", { exact: true })).toHaveValue(
    "Unfinished original teacher",
  );
});

test("recovers class drafts saved by the previous app version", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Load sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replace with sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  const id = await page
    .locator("[data-session]")
    .first()
    .getAttribute("data-session");
  await page.locator(`[data-session="${id}"]`).click();
  await page
    .getByLabel("Class note", { exact: true })
    .fill("Previous version unfinished note");
  await page.evaluate((id) => {
    const key = Object.keys(localStorage).find((k) =>
      k.endsWith("-session-" + id),
    )!;
    const draft = JSON.parse(localStorage.getItem(key)!);
    const legacyKey = key + "-" + draft.baseRevision;
    delete draft.baseRevision;
    localStorage.setItem(legacyKey, JSON.stringify(draft));
    localStorage.removeItem(key);
  }, id);
  await page.reload();
  await page.locator(`[data-session="${id}"]`).click();
  await expect(page.getByLabel("Class note", { exact: true })).toHaveValue(
    "Previous version unfinished note",
  );
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await page.locator(`[data-session="${id}"]`).click();
  await expect(page.getByLabel("Class note", { exact: true })).toHaveValue(
    "Previous version unfinished note",
  );
});
