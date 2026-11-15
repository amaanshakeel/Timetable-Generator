import { test, expect, type Page } from "@playwright/test";
import { fixture } from "../fixture";
const owner = "b1010101-0101-4101-8101-010101010101";
const email = "staff@example.invalid";
const user = {
  id: owner,
  email,
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-11-15T00:00:00Z",
};
const jwt = () =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: owner,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
async function mockCloud(page: Page, signedIn: boolean) {
  const session = {
    access_token: jwt(),
    refresh_token: "test-refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
  if (signedIn)
    await page.addInitScript(
      (session) =>
        localStorage.setItem(
          "sb-cloud-backup-auth-token",
          JSON.stringify(session),
        ),
      session,
    );
  const state = {
    fail: false,
    uploads: [] as any[],
    versions: [] as any[],
    emailRequests: [] as any[],
    holdFirst: null as Promise<void> | null,
    completed: [] as string[],
  };
  await page.route("https://cloud-backup.test/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "content-type": "application/json",
    };
    const send = (body: unknown) =>
      route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith("/otp")) {
      state.emailRequests.push(request.postDataJSON());
      return send({});
    }
    if (url.pathname.endsWith("/user")) return send(user);
    if (url.pathname.endsWith("/token")) return send(session);
    if (url.pathname.endsWith("/logout")) return send({});
    if (url.pathname.endsWith("/save_workspace_backup")) {
      const args = request.postDataJSON();
      state.uploads.push(args);
      if (state.uploads.length === 1 && state.holdFirst) await state.holdFirst;
      if (state.fail) return route.abort("failed");
      if (args.p_owner_id !== owner)
        return route.fulfill({
          status: 403,
          headers,
          body: JSON.stringify({ message: "Wrong owner" }),
        });
      if (!state.versions.some((v) => v.id === args.p_backup_id))
        state.versions.unshift({
          id: args.p_backup_id,
          workspace_id: args.p_workspace_id,
          device_id: args.p_device_id,
          device_name: args.p_device_name,
          workspace_name: args.p_workspace_name,
          revision: args.p_revision,
          created_at: new Date().toISOString(),
          snapshot: args.p_snapshot,
        });
      await send(args.p_backup_id);
      state.completed.push(args.p_backup_id);
      return;
    }
    if (url.pathname.endsWith("/workspace_backups")) {
      if (url.searchParams.get("select") === "snapshot") {
        const id = url.searchParams.get("id")?.replace("eq.", "");
        const version = state.versions.find((v) => v.id === id);
        return send({
          snapshot: {
            ...version.snapshot,
            settings: {
              ...version.snapshot.settings,
              term: "Restored from cloud",
            },
          },
        });
      }
      return send(
        state.versions.map(({ snapshot: _snapshot, ...metadata }) => metadata),
      );
    }
    throw Error(`Unexpected cloud endpoint: ${url.pathname}`);
  });
  return state;
}

test("email sign-in is optional and never blocks local editing", async ({
  page,
}) => {
  const cloud = await mockCloud(page, false);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Backup email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send sign-in link", exact: true })
    .click();
  await expect(
    page.getByText(/Check your email for the sign-in link/),
  ).toBeVisible();
  expect(cloud.emailRequests[0].email).toBe(email);
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Teacher name", { exact: true })
    .fill("Local staff record");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Local staff record", { exact: true }),
  ).toBeVisible();
  expect(cloud.uploads).toHaveLength(0);
});

test("backups retry durably and restore only after explicit review", async ({
  page,
}) => {
  const cloud = await mockCloud(page, true);
  cloud.fail = true;
  const p = fixture();
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
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Automatically back up this browser's workspace", {
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Back up now", exact: true }).click();
  await expect(page.getByText(/Cloud backup needs attention/)).toBeVisible();
  expect(cloud.uploads).toHaveLength(1);
  const backupId = cloud.uploads[0].p_backup_id;
  await page
    .getByLabel("Automatically back up this browser's workspace", {
      exact: true,
    })
    .uncheck();
  cloud.fail = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => cloud.versions.length).toBe(1);
  expect(cloud.uploads[1].p_backup_id).toBe(backupId);
  await page
    .getByLabel("Automatically back up this browser's workspace", {
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Teacher name", { exact: true })
    .fill("Automatically backed up teacher");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(
      () =>
        cloud.versions.some((v) =>
          v.snapshot.teachers.some(
            (t: { name: string }) =>
              t.name === "Automatically backed up teacher",
          ),
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh backup history", exact: true })
    .click();
  await page
    .locator(".cloud-version")
    .first()
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import this project?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Academic term", { exact: true })).toHaveValue(
    p.settings.term,
  );
  await page
    .locator(".cloud-version")
    .first()
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await expect(
    page.getByText("Restored from cloud", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    )
    .toBe(false);
  await page
    .locator(".cloud-backup-panel")
    .screenshot({ path: ".tmp/cloud-backups-mobile.png" });
});

test("an old upload never confirms newer local changes", async ({ page }) => {
  const cloud = await mockCloud(page, true);
  let release!: () => void;
  cloud.holdFirst = new Promise<void>((resolve) => (release = resolve));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Dashboard/ })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "setup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture())),
  });
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Automatically back up this browser's workspace", {
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Back up now", exact: true }).click();
  await expect.poll(() => cloud.uploads.length).toBe(1);
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit record", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Teacher name", { exact: true })
    .fill("Newer unsent version");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  release();
  await expect.poll(() => cloud.completed.length).toBe(1);
  await page.waitForTimeout(200);
  await expect(
    page.getByRole("button", { name: "Cloud: Saved", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(
      () =>
        cloud.versions.some((v) =>
          v.snapshot.teachers.some(
            (t: { name: string }) => t.name === "Newer unsent version",
          ),
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Cloud: Saved", exact: true }),
  ).toBeVisible();
});

test("an explicitly queued backup resumes after reload with automatic backup off", async ({
  page,
}) => {
  const cloud = await mockCloud(page, true);
  cloud.fail = true;
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back up now", exact: true }).click();
  await expect(page.getByText(/Cloud backup needs attention/)).toBeVisible();
  const id = cloud.uploads[0].p_backup_id;
  cloud.fail = false;
  await page.reload();
  await expect.poll(() => cloud.versions.length).toBe(1);
  expect(cloud.uploads[1].p_backup_id).toBe(id);
  await expect(
    page.getByLabel("Automatically back up this browser's workspace", {
      exact: true,
    }),
  ).not.toBeChecked();
});
