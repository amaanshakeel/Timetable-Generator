import { test, expect } from "@playwright/test";
test("saving an unchanged subject preserves all its scheduled attendance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".nav-count")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Subject name", { exact: true })
    .fill("Functional English revised");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.locator('.data-table tbody').getByText("Functional English revised", { exact: true }),
  ).toHaveCount(4);
  await expect(page.locator(".nav-count")).toHaveCount(0);
});
test("subject requirement changes show affected classes before applying", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page.getByLabel("Classes per week").fill("4");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Review subject offering changes",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Affected scheduled classes/)).toBeVisible();
  await expect(page.locator(".nav-count")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Apply reviewed changes", exact: true })
    .click();
  await expect(page.locator(".nav-count")).toHaveCount(1);
});
test("takeover refreshes stale settings and asks how to handle an older dirty draft", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Academic term").fill("Old unfinished term");
  const b = await context.newPage();
  await b.goto("/");
  await b
    .getByRole("button", { name: "Take over editing", exact: true })
    .click();
  await b
    .getByRole("button", { name: "Resume previous work", exact: true })
    .click();
  await b.getByRole("button", { name: "Settings", exact: true }).click();
  await b.getByLabel("Academic term").fill("New authoritative term");
  await b.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(b.getByText("All changes saved", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Take over editing", exact: true })
    .click();
  await expect(page.getByLabel("Academic term")).toHaveValue(
    "New authoritative term",
  );
  await expect(
    page.getByRole("button", { name: "Use latest values", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use latest values", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Resume previous work", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Academic term")).toHaveValue(
    "New authoritative term",
  );
});
test("drag swaps occupied cells and locked classes survive regeneration", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  const ids = await page
    .locator("[data-session]")
    .evaluateAll((nodes) =>
      nodes.slice(0, 2).map((n) => n.getAttribute("data-session")!),
    );
  const first = page.locator(`[data-session="${ids[0]}"]`),
    second = page.locator(`[data-session="${ids[1]}"]`);
  const before = await second.evaluate((n) => ({
    cell: (n.closest("td") as HTMLTableCellElement).cellIndex,
    row: (n.closest("tr") as HTMLTableRowElement).rowIndex,
  }));
  await first.dragTo(second);
  await expect
    .poll(() =>
      first.evaluate((n) => ({
        cell: (n.closest("td") as HTMLTableCellElement).cellIndex,
        row: (n.closest("tr") as HTMLTableRowElement).rowIndex,
      })),
    )
    .toEqual(before);
  await first.click();
  await page.getByRole("button", { name: "Lock class", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await expect
    .poll(() =>
      first.evaluate((n) => ({
        cell: (n.closest("td") as HTMLTableCellElement).cellIndex,
        row: (n.closest("tr") as HTMLTableRowElement).rowIndex,
      })),
    )
    .toEqual(before);
  await first.click();
  await expect(
    page.getByRole("button", { name: "Unlock class", exact: true }),
  ).toBeVisible();
});
test("manual conflicts stay editable and issues can open the affected class", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await page.locator("[data-session]").first().click();
  const room = await page.getByLabel("Room", { exact: true }).inputValue(),
    day = await page.getByLabel("Day", { exact: true }).inputValue(),
    slot = await page.getByLabel("Time slot", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("[data-session]").nth(1).click();
  await page.getByLabel("Room", { exact: true }).selectOption(room);
  await page.getByLabel("Day", { exact: true }).selectOption(day);
  await page.getByLabel("Time slot", { exact: true }).selectOption(slot);
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await expect(page.locator(".class-card.has-warning").first()).toBeVisible();
  await page.getByRole("button", { name: /^Clashes & Issues/ }).click();
  await page
    .getByRole("button", { name: "Open class", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit class", exact: true }),
  ).toBeVisible();
});
test("builds a complete timetable from staff-entered setup without sample data", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start a new project", exact: true })
    .click();
  await page.getByRole("button", { name: "Departments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .first()
    .click();
  await page.getByLabel("Department name").fill("Computer Science");
  await page.getByLabel("Department code").fill("CS");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  await page
    .getByRole("button", { name: "Add subject", exact: true })
    .first()
    .click();
  await page.getByLabel("University-wide subject code").fill("CS101");
  await page.getByLabel("Subject name").fill("Programming");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await page.getByLabel("Teacher name").fill("Dr. Faculty");
  await page.getByLabel("Programming").check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Rooms", exact: true }).click();
  await page
    .getByRole("button", { name: "Add room", exact: true })
    .first()
    .click();
  await page.getByLabel("Room name").fill("CR-01");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply timetable", exact: true })
    .click();
  await expect(page.locator("[data-session]")).toHaveCount(1);
  await page.getByRole("tab", { name: /Tuesday/ }).click();
  await expect(page.locator("[data-session]")).toHaveCount(1);
});

test("setup starts empty and sample project can generate, edit, save and recover", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your timetable, beautifully organized.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await expect(
    page.getByRole("heading", { name: /^University timetable/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review generated timetable" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await expect(page.locator("[data-session]").first()).toBeVisible();
  await page.locator("[data-session]").first().click();
  await page.getByLabel("Class note").fill("Bring lab notebooks");
  await page.getByRole("button", { name: "Save class" }).click();
  await expect(page.getByText("Bring lab notebooks").first()).toBeVisible();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume previous work" }).click();
  await expect(page.getByText("Bring lab notebooks").first()).toBeVisible();
});
test("setup allows custom teacher and room availability", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start a new project", exact: true })
    .click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page.getByRole("button", { name: "Add teacher" }).first().click();
  await page.getByLabel("Teacher name").fill("Dr. Test");
  await page.getByLabel("Custom availability").check();
  await expect(page.getByRole("button", { name: /Mon.*08:30/ })).toBeVisible();
});
test("exports actual PDF and Excel files and keeps a second tab read-only", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await page.locator("[data-session]").first().click();
  await page
    .getByLabel("Class note", { exact: true })
    .fill(
      "Élodie · Κατερίνα · Иванова — A long note must remain readable across export pages. ".repeat(
        14,
      ),
    );
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await page
    .getByRole("button", { name: "Export timetable", exact: true })
    .click();
  const pdfDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download timetable", exact: true })
    .click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await pdf.saveAs(".tmp/sample-export.pdf");
  await page
    .getByRole("button", { name: "Export timetable", exact: true })
    .click();
  await page.getByRole("button", { name: /Excel workbook/ }).click();
  const excelDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download timetable", exact: true })
    .click();
  const excel = await excelDownload;
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
  await excel.saveAs(".tmp/sample-export.xlsx");
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByText(
      "Another tab is editing this project. This tab is read-only.",
    ),
  ).toBeVisible();
  await other.getByRole("button", { name: "Take over editing" }).click();
  await expect(
    page.getByText(
      "Another tab is editing this project. This tab is read-only.",
    ),
  ).toBeVisible();
  await expect(
    other.getByText(
      "Another tab is editing this project. This tab is read-only.",
    ),
  ).not.toBeVisible();
});
test("recovers an unfinished class note after an accidental reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply timetable" }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.locator("[data-session]").first().click();
  await page.getByLabel("Class note").fill("Unfinished note draft");
  await page.reload();
  await page.getByRole("button", { name: "Resume previous work" }).click();
  await page.locator("[data-session]").first().click();
  await expect(page.getByLabel("Class note")).toHaveValue(
    "Unfinished note draft",
  );
});
test("new projects do not inherit unfinished teacher forms from the previous project", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample project" }).click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page.getByRole("button", { name: "Add teacher" }).first().click();
  await page.getByLabel("Teacher name").fill("Old project draft");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new timetable", exact: true })
    .click();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page.getByRole("button", { name: "Add teacher" }).first().click();
  await expect(page.getByLabel("Teacher name")).toHaveValue("");
});
