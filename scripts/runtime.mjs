import { spawn } from "node:child_process";
import { validarEntorno } from "./runtime-env.mjs";

const mode = process.argv[2] ?? "web";
try {
  validarEntorno(process.env, mode);
  const commands = {
    web: ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
    worker: ["--import", "tsx", "scripts/nomina-worker.ts"],
    migrate: ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    seed: ["--import", "tsx", "prisma/seed.ts"],
  };
  const args = commands[/** @type {keyof typeof commands} */ (mode)];
  const child = spawn(process.execPath, [...args, ...process.argv.slice(3)], {
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
  child.on("error", () => {
    console.error("No fue posible iniciar el proceso solicitado.");
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode =
      code ?? (signal === "SIGTERM" || signal === "SIGINT" ? 0 : 1);
  });
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Configuración inválida.",
  );
  process.exitCode = 1;
}
