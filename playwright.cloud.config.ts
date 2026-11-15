import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/cloud-e2e",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5175",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE }
      : {},
  },
  webServer: process.env.EXTERNAL_CLOUD_SERVER
    ? undefined
    : {
        command: "node scripts/cloud-test-server.mjs",
        url: "http://127.0.0.1:5175",
        reuseExistingServer: false,
      },
});
