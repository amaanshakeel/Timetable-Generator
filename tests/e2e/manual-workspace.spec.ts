import {
  createManualTimetable,
  placeManualClass,
} from "../../src/domain/manual";
import { test, expect } from "@playwright/test";
import { fixture } from "../fixture";

test("manual and automatic choices share an editable workspace with live clash warnings", async ({
  page,
}) => {
  const p = fixture();
  p.sessions = [];
  p.teachingGroups = [];
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "setup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate timetable", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create Manually", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create Manually", exact: true })
    .click();
  await expect(page.locator("[data-session]")).toHaveCount(0);
  const pending = page.locator(".manual-class-tray button[draggable]").first();
  await expect(pending).toContainText("2 left");
  await pending.click();
  await page
    .getByRole("button", { name: "Move to CR-01 Mon 08:30", exact: true })
    .click();
  await page.getByRole("button", { name: "Place class", exact: true }).click();
  await expect(page.locator("[data-session]")).toHaveCount(1);
  await pending.dragTo(
    page.locator('tr[data-room-id="r1"] td[data-slot-id="p1"]'),
    { targetPosition: { x: 30, y: 40 } },
  );
  await expect(page.getByRole("dialog")).toContainText("overlapping classes");
  await expect(page.getByRole("dialog")).toContainText("double-booked");
  await page.getByRole("button", { name: "Place class", exact: true }).click();
  await expect(page.locator(".class-card.has-warning")).toHaveCount(2);
  await expect(pending).toHaveCount(0);
  await page.locator("[data-session]").first().click();
  await page
    .getByLabel("Class note", { exact: true })
    .fill("Manual note survives");
  await page.getByRole("button", { name: "Save class", exact: true }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-session]")).toHaveCount(2);
  await expect(
    page.getByText("Manual note survives", { exact: true }),
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
  await expect(
    page.locator(".stats-grid .stat-card").first().locator("strong"),
  ).toHaveText("02");
  await expect(page.locator("[data-session]").first()).toHaveAttribute(
    "draggable",
    "true",
  );
});

test("new subject offerings enter an existing manual tray without disturbing locked classes", async ({
  page,
}) => {
  let p = createManualTimetable(fixture(), "Manual plan");
  p = placeManualClass(p, p.teachingGroups[0].id, p.teachers[0].id, {
    roomId: "r1",
    dayId: "Mon",
    slotId: "p1",
  });
  p.sessions[0].locked = true;
  p.sessions[0].note = "Preserve original placement";
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "manual.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page.getByRole("button", { name: "Subjects", exact: true }).click();
  await page
    .getByRole("button", { name: "Add subject", exact: true })
    .first()
    .click();
  await page
    .getByLabel("University-wide subject code", { exact: true })
    .fill("PHY101");
  await page.getByLabel("Subject name", { exact: true }).fill("Physics");
  await page.getByLabel("Classes per week", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await expect(
    page.locator(".pending-class").filter({ hasText: "Physics" }),
  ).toContainText("1 left");
  await expect(
    page.getByText("Preserve original placement", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox", { name: /Physics/ }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page.locator(".pending-class").filter({ hasText: "Physics" }).click();
  await page
    .getByRole("button", { name: "Move to CR-02 Mon 10:00", exact: true })
    .click();
  await page.getByRole("button", { name: "Place class", exact: true }).click();
  await expect(page.locator("[data-session]")).toHaveCount(2);
  await page.locator(`[data-session="${p.sessions[0].id}"]`).click();
  await expect(
    page.getByRole("button", { name: "Unlock class", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Class note", { exact: true })).toHaveValue(
    "Preserve original placement",
  );
});
