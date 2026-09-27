import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";

// Organización antes que seguridad, igual que la vinculación de usuarios.
// Conserva la jefatura y los permisos durante la resolución y coordina cierres.
export function transaccionAusencias<T>(
  db: PrismaClient,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await tx.$queryRaw`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
    return operacion(tx);
  });
}
export async function comprobarMesAbierto(
  tx: Prisma.TransactionClient,
  fecha: Date,
) {
  const periodo = await tx.periodoNomina.findUnique({
    where: {
      mes_anio: { mes: fecha.getUTCMonth() + 1, anio: fecha.getUTCFullYear() },
    },
    select: { estado: true },
  });
  if (periodo?.estado === "CERRADO")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "El período de la ausencia está cerrado.",
    });
}
