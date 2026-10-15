import type { Prisma } from "@prisma/client";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { actorVigente } from "~/server/permisos/Helpers/acceso-policy";
import {
  REPORTES_TRIBUTARIOS,
  type TipoReporte,
} from "~/shared/reportes-tributarios";
export function permisosTributario(
  tipo: TipoReporte,
  accion?: "GENERATE" | "EXPORT",
) {
  const prefijo = REPORTES_TRIBUTARIOS[tipo].permiso;
  return [
    `${prefijo}.VIEW` as const,
    ...(accion ? [`${prefijo}.${accion}` as const] : []),
  ];
}
export function autorizarTributario(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  tipo: TipoReporte,
  accion?: "GENERATE" | "EXPORT",
) {
  return actorVigente(tx, actor, permisosTributario(tipo, accion));
}
