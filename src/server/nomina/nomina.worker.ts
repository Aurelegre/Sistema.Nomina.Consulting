import type { PrismaClient } from "@prisma/client";

// Durable queue in MySQL. The procedure's named lock makes multiple workers safe.
// A disconnected worker releases its lock; EN_PROCESO is picked up on restart.
export async function ejecutarPendientes(
  db: PrismaClient,
  detener = () => false,
) {
  const trabajos = await db.nomina.findMany({
    where: { estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
    select: { id: true },
    orderBy: { fechaSolicitud: "asc" },
    take: 5,
  });
  for (const trabajo of trabajos) {
    if (detener()) break;
    try {
      await db.$executeRaw`CALL sp_generar_nomina(${trabajo.id})`;
    } catch {
      console.error(
        `Falló la ejecución de nómina ${trabajo.id}. Consulta su estado en administración.`,
      );
    }
  }
  return trabajos.length;
}
