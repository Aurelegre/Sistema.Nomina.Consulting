import type { Prisma } from "@prisma/client";
import {
  actorVigente,
  prohibido,
} from "~/server/permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import type { CodigoPermiso } from "~/server/permisos/Helpers/permisos";

export async function autorizarNomina(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  permiso?: CodigoPermiso,
  propia = false,
) {
  const gestor = await actorVigente(tx, actor, permiso ? [permiso] : []);
  if (propia && !gestor.empleado)
    prohibido("Necesitas un empleado vinculado para consultar Mi Nómina.");
  return gestor;
}

export async function comprobarPeriodoDisponible(
  tx: Prisma.TransactionClient,
  periodoId: number,
) {
  const periodo = await tx.periodoNomina.findUnique({
    where: { id: periodoId },
  });
  if (periodo?.estado !== "ABIERTO")
    prohibido("El período está cerrado o se está generando su nómina.");
  return periodo;
}
