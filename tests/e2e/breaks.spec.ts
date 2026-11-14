import { test, expect, type Page } from "@playwright/test";
async function generated(page: Page) {
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
}
test("merges an empty break column, expands for a manual class, and merges again when cleared", async ({
  page,
}) => {
  await generated(page);
  const merged = page.locator("td.merged-break-cell");
  await expect(merged).toHaveCount(1);
  await expect(merged).toHaveAttribute("rowspan", "4");
  await expect(merged.locator(".break-label")).toHaveText("Break");
  const first = page.locator("[data-session]").first(),
    id = await first.getAttribute("data-session");
  await first.click();
  const original = await page
    .getByLabel("Time slot", { exact: true })
    .inputValue();
  await page.getByLabel("Time slot", { exact: true }).selectOption("p3");
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await expect(merged).toHaveCount(0);
  const moved = page.locator(`[data-session="${id}"]`);
  await expect(moved).not.toHaveClass(/has-warning/);
  await moved.click();
  await page.getByLabel("Time slot", { exact: true }).selectOption(original);
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await expect(merged).toHaveCount(1);
});
test("supports dragging into a merged break column and exposes break availability", async ({
  page,
}) => {
  await generated(page);
  const first = page.locator("[data-session]").first(),
    id = await first.getAttribute("data-session");
  await first.dragTo(page.locator("td.merged-break-cell"), {
    targetPosition: { x: 30, y: 40 },
  });
  await expect(page.locator("td.merged-break-cell")).toHaveCount(0);
  await page.locator(`[data-session="${id}"]`).click();
  await expect(page.getByLabel("Time slot", { exact: true })).toHaveValue("p3");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page.getByLabel("Custom availability", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Mon 11:30 12:30", exact: true }),
  ).toBeVisible();
});
test("supports choosing a room when moving into a merged break column without dragging", async ({
  page,
}) => {
  await generated(page);
  const card = page.locator("[data-session]").first(),
    id = await card.getAttribute("data-session");
  await card.click();
  await page.getByRole("button", { name: "Move / swap", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Move class into break 11:30 12:30",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Choose a room for this break slot",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^CR-02/ }).click();
  await page.locator(`[data-session="${id}"]`).click();
  await expect(page.getByLabel("Room", { exact: true })).toHaveValue("r2");
  await expect(page.getByLabel("Time slot", { exact: true })).toHaveValue("p3");
});
