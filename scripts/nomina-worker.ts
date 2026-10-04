import { PrismaClient } from "@prisma/client";
import { setTimeout } from "node:timers/promises";
import { ejecutarPendientes } from "../src/server/nomina/nomina.worker";

const db = new PrismaClient();
let detener = false;
process.on("SIGINT", () => {
  detener = true;
});
process.on("SIGTERM", () => {
  detener = true;
});
try {
  do {
    try {
      await ejecutarPendientes(db);
    } catch {
      console.error(
        "No fue posible consultar la cola de nómina; se reintentará.",
      );
    }
    if (process.argv.includes("--once")) break;
    if (!detener) await setTimeout(2000);
  } while (!detener);
} finally {
  await db.$disconnect();
}
