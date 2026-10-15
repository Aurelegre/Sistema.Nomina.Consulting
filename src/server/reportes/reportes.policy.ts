import type { Prisma } from "@prisma/client";
import { actorVigente } from "~/server/permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
export function autorizarPoliza(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  accion?: "GENERATE" | "EXPORT",
) {
  return actorVigente(tx, actor, [
    "ACCOUNTING_POLICY.VIEW",
    ...(accion ? [`ACCOUNTING_POLICY.${accion}` as const] : []),
  ]);
}
