import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:3100", channel: "msedge", headless: true },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/login",
    timeout: 120000,
    env: { APP_URL: "http://localhost:3100" },
  },
});
