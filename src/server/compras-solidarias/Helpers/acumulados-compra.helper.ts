import type { Prisma } from "@prisma/client";

// Consulta interna para el futuro procesador: utiliza el período explícito,
// nunca la fecha del sistema ni el período abierto al consultar un histórico.
export async function acumuladosComprasPeriodo(
  tx: Prisma.TransactionClient,
  periodoId: number,
) {
  return tx.compraSolidaria.groupBy({
    by: ["empleadoId"],
    where: { periodoId },
    _sum: { monto: true },
  });
}
