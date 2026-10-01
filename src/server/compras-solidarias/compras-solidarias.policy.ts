import type { Prisma } from "@prisma/client";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import {
  actorVigente,
  prohibido,
} from "~/server/permisos/Helpers/acceso-policy";
export const permisosCompra = {
  consultar: "ASSOCIATION.PURCHASES.VIEW",
  crear: "ASSOCIATION.PURCHASES.CREATE",
  editar: "ASSOCIATION.PURCHASES.UPDATE",
  eliminar: "ASSOCIATION.PURCHASES.DELETE",
} as const;
export function autorizarCompra(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  accion: keyof typeof permisosCompra,
) {
  return actorVigente(tx, actor, [permisosCompra[accion]]);
}
export async function autorizarContextoCompra(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
) {
  const gestor = await actorVigente(tx, actor, []);
  if (
    !gestor.permisos.some(
      (p) => p === permisosCompra.consultar || p === permisosCompra.crear,
    )
  )
    prohibido("No tienes permiso para consultar compras ni registrarlas.");
  return gestor;
}
