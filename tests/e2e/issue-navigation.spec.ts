import { test, expect } from "@playwright/test";

test("setup issues open the offering and scheduled clash badges open their timetable cell", async ({
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
  await expect(
    page.getByText(
      "Setup is loaded. Generate a timetable, review it, then apply it to place classes in the grid.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await page
    .getByRole("button", { name: "Setup", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit subject offering", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("University-wide subject code", { exact: true }),
  ).toHaveValue("ENG-101");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  await expect(page.locator("[data-session]").first()).toBeVisible();
  await page.locator("[data-session]").first().click();
  const room = await page.getByLabel("Room", { exact: true }).inputValue();
  const day = await page.getByLabel("Day", { exact: true }).inputValue();
  const slot = await page.getByLabel("Time slot", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.locator("[data-session]").nth(1).click();
  await page.getByLabel("Room", { exact: true }).selectOption(room);
  await page.getByLabel("Day", { exact: true }).selectOption(day);
  await page.getByLabel("Time slot", { exact: true }).selectOption(slot);
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  const clash = page
    .locator(".issue-row")
    .filter({ hasText: "double-booked" })
    .first();
  await clash.getByRole("button", { name: "2 classes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edit class", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Day", { exact: true })).toHaveValue(day);
  await expect(page.locator(".class-card.inspected")).toHaveCount(1);
});
