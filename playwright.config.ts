import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE }
      : {},
  },
  webServer: process.env.EXTERNAL_SERVER
    ? undefined
    : {
        command: "node node_modules/vite/bin/vite.js --host 127.0.0.1",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
});
