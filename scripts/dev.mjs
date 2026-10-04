import { spawn } from "node:child_process";

// Both children inherit the environment, including an isolated DATABASE_URL in tests.
const web = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--turbo",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", windowsHide: true },
);
const worker = spawn(
  process.execPath,
  ["--env-file=.env", "--import", "tsx", "scripts/nomina-worker.ts"],
  { stdio: "inherit", windowsHide: true },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  web.kill();
  worker.kill();
  process.exitCode = code;
}
web.on("exit", (code) => stop(code ?? 1));
worker.on("exit", (code) => stop(code ?? 1));
web.on("error", () => stop(1));
worker.on("error", () => stop(1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
