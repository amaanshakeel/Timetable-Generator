import { test, expect } from "@playwright/test";
test("opens directly into a working dashboard without a project-start screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start a new project", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Resume previous work", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Teachers", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Teacher name")).toBeVisible();
});
test("automatically restores saved data and the last workspace view", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await page.getByLabel("Teacher name").fill("Dr. Automatic Recovery");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Teachers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Dr. Automatic Recovery", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume previous work", exact: true }),
  ).toHaveCount(0);
});
