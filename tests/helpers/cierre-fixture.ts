import type { PrismaClient } from "@prisma/client";
import { transaccionOrganizacion } from "../../src/server/empleados/Helpers/organizacion.helper";

// Simulates the final closure for legacy module isolation tests only.
// Production has no manual closure service or route.
export async function cerrarPeriodoNomina(db: PrismaClient, id: number) {
  return transaccionOrganizacion(db, (tx) =>
    tx.periodoNomina.update({
      where: { id },
      data: { estado: "CERRADO", fechaCierre: new Date() },
    }),
  );
}
