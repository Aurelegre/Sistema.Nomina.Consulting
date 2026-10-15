import { PrismaClient } from "@prisma/client";
import { setTimeout } from "node:timers/promises";
import { ejecutarPendientes } from "../src/server/nomina/nomina.worker";

const db = new PrismaClient();
let detener = false;
let fallosConsecutivos = 0;
console.info("Trabajador de nómina iniciado.");
process.on("SIGINT", () => {
  detener = true;
});
process.on("SIGTERM", () => {
  detener = true;
});
try {
  do {
    try {
      await ejecutarPendientes(db, () => detener);
      fallosConsecutivos = 0;
    } catch {
      fallosConsecutivos++;
      console.error(
        "No fue posible consultar la cola de nómina; se reintentará.",
      );
    }
    if (process.argv.includes("--once") || fallosConsecutivos >= 5) {
      if (fallosConsecutivos > 0) process.exitCode = 1;
      break;
    }
    if (!detener) await setTimeout(2000);
  } while (!detener);
} finally {
  await db.$disconnect();
}
