import { test, expect } from "@playwright/test";

test("class teacher choices follow subject eligibility", async ({ page }) => {
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
  await page.locator("[data-session]").first().click();
  const group = page.getByLabel("Subject & teaching group", { exact: true });
  const teacher = page.getByLabel("Teacher", { exact: true });
  const english = await group
    .locator("option")
    .filter({ hasText: "Functional English" })
    .first()
    .getAttribute("value");
  await group.selectOption(english!);
  await expect(teacher.locator('option[value]:not([value=""])')).toHaveText([
    "Dr. Ayesha Khan",
    "Mr. Ahmed Raza",
  ]);
  await teacher.selectOption("t2");
  const management = await group
    .locator("option")
    .filter({ hasText: "Principles of Management" })
    .first()
    .getAttribute("value");
  await group.selectOption(management!);
  await expect(teacher).toHaveValue("t2");
  await expect(teacher.locator('option[value]:not([value=""])')).toHaveText([
    "Mr. Ahmed Raza",
  ]);
  const math = await group
    .locator("option")
    .filter({ hasText: "Quantitative Reasoning" })
    .first()
    .getAttribute("value");
  await group.selectOption(math!);
  await expect(teacher).toHaveValue("");
  await expect(teacher.locator('option[value]:not([value=""])')).toHaveText([
    "Dr. Sara Ali",
  ]);
});
