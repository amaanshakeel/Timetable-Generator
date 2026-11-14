import { fixture } from "../fixture";
import { createTimetable } from "../../src/domain/timetables";
import { test, expect } from "@playwright/test";

test("saved timetable storage retains generated versions and supports viewing and deleting", async ({
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
    .getByRole("button", { name: "Generate Automatically", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved timetables", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate Automatically", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await expect(page.locator(".saved-timetable-row")).toHaveCount(2);
  await page
    .locator(".saved-timetable-row")
    .filter({ hasText: "Timetable 1" })
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Active timetable", { exact: true })
      .locator("option:checked"),
  ).toHaveText("Timetable 1");
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await page
    .locator(".saved-timetable-row")
    .filter({ hasText: "Timetable 2" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".saved-timetable-row")).toHaveCount(2);
  await page
    .locator(".saved-timetable-row")
    .filter({ hasText: "Timetable 2" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete timetable", exact: true })
    .click();
  await expect(page.locator(".saved-timetable-row")).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await expect(page.locator(".saved-timetable-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete timetable", exact: true })
    .click();
  await expect(
    page.getByText("No saved timetables yet", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("[data-session]").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await expect(page.locator(".saved-timetable-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await expect(page.locator(".data-table tbody tr")).toHaveCount(6);
});

test("viewing retained timetables does not overwrite deletion recovery", async ({
  page,
}) => {
  const original = fixture();
  const empty = createTimetable(original, "Empty retained", {
    sessions: [],
    teachingGroups: [],
  });
  const imported = createTimetable(empty, "To delete", original);
  imported.sessions[0].note = "Recover this deleted version";
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "library.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await page
    .locator(".saved-timetable-row")
    .filter({ hasText: "To delete" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete timetable", exact: true })
    .click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const recoveryName = () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const request = indexedDB.open("uor-timetable-v1");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const read = db
              .transaction("projects")
              .objectStore("projects")
              .get("recovery");
            read.onsuccess = () => {
              resolve(read.result?.timetableName || "");
              db.close();
            };
            read.onerror = () => {
              reject(read.error);
              db.close();
            };
          };
        }),
    );
  await expect.poll(recoveryName).toBe("To delete");
  await page
    .locator(".saved-timetable-row")
    .filter({ hasText: "Empty retained" })
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Active timetable", { exact: true })
      .locator("option:checked"),
  ).toHaveText("Empty retained");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect.poll(recoveryName).toBe("To delete");
});
