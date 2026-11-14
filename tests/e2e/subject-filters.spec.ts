import { test, expect } from "@playwright/test";

test("subject filters support all semesters with all or one department", async ({
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
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  const semester = page.getByLabel("Offering semester", { exact: true });
  const department = page.getByLabel("Offering department", { exact: true });
  const rows = page.locator(".data-table tbody tr");
  await semester.selectOption({ label: "All semesters" });
  await expect(rows).toHaveCount(15);
  await department.selectOption("cs");
  await expect(rows).toHaveCount(5);
  await expect(rows.filter({ hasText: "Database Systems" })).toContainText(
    "Sem 3",
  );
  await semester.selectOption("1");
  await expect(rows).toHaveCount(4);
  await semester.selectOption("0");
  await expect(department).toHaveValue("cs");
  await expect(rows).toHaveCount(5);
  await page.getByLabel("Search subjects", { exact: true }).fill("Database");
  await expect(rows).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add subject", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Semester", { exact: true })).toHaveValue("1");
});
