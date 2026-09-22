import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  actorVigente,
  type Gestor,
} from "~/server/permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
export function autorizarAusencias(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  accion: "consultar" | "crear" | "resolver",
) {
  return actorVigente(tx, actor, [
    accion === "consultar"
      ? "ABSENCES.VIEW"
      : accion === "crear"
        ? "ABSENCES.CREATE"
        : "ABSENCES.APPROVE",
  ]);
}
export function empleadoSolicitante(gestor: Gestor) {
  if (!gestor.empleado)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Debes tener un empleado vinculado para solicitar una ausencia.",
    });
  return gestor.empleado;
}
export function ambitoAusencias(
  gestor: Gestor,
  ambito?: "propias" | "departamento",
): Prisma.AusenciaWhereInput {
  if (ambito === "propias")
    return { empleadoId: empleadoSolicitante(gestor).id };
  if (ambito === "departamento") {
    const jefe = gestor.empleado?.departamentoQueDirige;
    if (!jefe)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Debes ser jefe de departamento para ingresar a revisión.",
      });
    return { departamentoId: jefe.id };
  }
  if (gestor.permisos.includes("ABSENCES.VIEW_ALL")) return {};
  if (!gestor.empleado) return { id: -1 };
  const jefe = gestor.empleado.departamentoQueDirige;
  return {
    OR: [
      { empleadoId: gestor.empleado.id },
      ...(jefe ? [{ departamentoId: jefe.id }] : []),
    ],
  };
}
export function autorizarResolucion(gestor: Gestor, departamentoId: number) {
  if (gestor.empleado?.departamentoQueDirige?.id !== departamentoId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Solo el jefe del departamento de la solicitud puede resolverla.",
    });
}
