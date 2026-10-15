import { defineConfig } from "@playwright/test";
if (process.env.TIENDA_TEST_ISOLATED !== "1")
  throw new Error("Ejecuta pnpm test:tienda:ui para usar una base aislada.");
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["compras-solidarias.spec.ts", "periodos.spec.ts"],
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3100", channel: "msedge", headless: true },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/login",
    timeout: 120000,
    env: {
      APP_URL: "http://localhost:3100",
      DATABASE_URL: process.env.DATABASE_URL!,
    },
  },
});
