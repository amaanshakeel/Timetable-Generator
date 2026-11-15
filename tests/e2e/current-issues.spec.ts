import { test, expect } from "@playwright/test";
import { fixture } from "../fixture";

test("issues reflect only current classes and clear before creation and after final deletion", async ({
  page,
}) => {
  const setup = fixture();
  setup.sessions = [];
  setup.teachingGroups = [];
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "setup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(setup)),
    });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await expect(
    page.getByText("No timetable to check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".issue-row")).toHaveCount(0);
  const clash = fixture();
  clash.sessions[1] = {
    ...clash.sessions[1],
    dayId: clash.sessions[0].dayId,
    slotId: clash.sessions[0].slotId,
    roomId: clash.sessions[0].roomId,
  };
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "clash.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(clash)),
    });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await expect(
    page.locator(".issue-row").filter({ hasText: "double-booked" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open class", exact: true })
    .first()
    .click();
  await page.getByLabel("Day", { exact: true }).selectOption("Wed");
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await expect(page.locator(".issue-row")).toHaveCount(0);
  await expect(
    page.getByText("Everything is in harmony", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page
    .getByRole("button", { name: "Saved timetables", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await expect(
    page.getByText("No timetable to check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".issue-row")).toHaveCount(0);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("No timetable to check", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0 to review", { exact: true })).toBeVisible();
});
