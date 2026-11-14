import { test, expect } from "@playwright/test";

test("department semesters persist and filter subject entry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Departments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Department name", { exact: true })
    .fill("Computer Science");
  await page.getByLabel("Department code", { exact: true }).fill("CS");
  await page
    .getByRole("checkbox", { name: "Semester 1", exact: true })
    .uncheck();
  await page.getByRole("checkbox", { name: "Semester 3", exact: true }).check();
  await page.getByRole("checkbox", { name: "Semester 5", exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".data-table tbody")).toContainText(
    "Semester 3, Semester 5",
  );
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Semester 3", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Semester 5", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Department name", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Department name", { exact: true })
    .fill("Software Engineering");
  await page.getByLabel("Department code", { exact: true }).fill("SE");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Semester 5", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  await page
    .getByRole("button", { name: "Add subject", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Department", { exact: true }).locator('option[value=""]'),
  ).toHaveText("Select department");
  await expect(
    page.getByLabel("Department", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page.getByLabel("Semester", { exact: true }).selectOption("3");
  await expect(
    page.getByLabel("Department", { exact: true }).locator("option"),
  ).toHaveCount(3);
  await page
    .getByLabel("Department", { exact: true })
    .selectOption({ label: "Computer Science" });
  await page.getByLabel("Semester", { exact: true }).selectOption("2");
  await expect(page.getByLabel("Department", { exact: true })).toHaveValue("");
});
