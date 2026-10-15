import { defineConfig } from "@playwright/test";
if (process.env.TIENDA_TEST_ISOLATED !== "1")
  throw new Error("Ejecuta test:cumpleaneros ui con una base aislada.");
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "cumpleaneros.spec.ts",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  use: { baseURL: "http://localhost:3100", channel: "msedge", headless: true },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3100",
    url: "http://localhost:3100/login",
    timeout: 120000,
    env: {
      APP_URL: "http://localhost:3100",
      DATABASE_URL: process.env.DATABASE_URL!,
    },
  },
});
