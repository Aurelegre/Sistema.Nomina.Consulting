import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Orden de bloqueo compartido para asignaciones, jefaturas y bajas.
export async function transaccionOrganizacion<T>(
  db: PrismaClient | Prisma.TransactionClient,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  try {
    const ejecutar = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT id FROM departamento ORDER BY id FOR UPDATE`;
      return operacion(tx);
    };
    return "$transaction" in db
      ? await db.$transaction(ejecutar, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        })
      : await ejecutar(db);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Ya existe un registro con ese código, nombre o jefe asignado.",
        });
      if (error.code === "P2034")
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "La organización cambió. Vuelve a consultar e intenta nuevamente.",
        });
    }
    throw error;
  }
}
export async function departamentoActivo(
  tx: Prisma.TransactionClient,
  id: number,
) {
  const departamento = await tx.departamento.findUnique({ where: { id } });
  if (departamento?.estado !== "ACTIVO")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selecciona un departamento activo.",
    });
}
