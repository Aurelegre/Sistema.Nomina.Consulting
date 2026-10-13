import type { Prisma } from "@prisma/client";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { actorVigente } from "~/server/permisos/Helpers/acceso-policy";
export function autorizarCumpleaneros(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  exportar = false,
) {
  return actorVigente(
    db,
    actor,
    exportar
      ? ["BIRTHDAYS_REPORT.VIEW", "BIRTHDAYS_REPORT.EXPORT"]
      : ["BIRTHDAYS_REPORT.VIEW"],
  );
}
