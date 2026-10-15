import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { actorVigente } from "~/server/permisos/Helpers/acceso-policy";
import type { CodigoPermiso } from "~/server/permisos/Helpers/permisos";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";

export const permisosNovedad = {
  HORAS_EXTRAS: "PAYROLL_NEWS.OVERTIME",
  HORAS_DOBLES: "PAYROLL_NEWS.DOUBLE_TIME",
  PIEZAS: "PAYROLL_NEWS.PRODUCTION",
  VENTAS: "PAYROLL_NEWS.SALES",
} as const satisfies Record<string, CodigoPermiso>;

export async function autorizarNovedades(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  permiso?: CodigoPermiso,
) {
  const gestor = await actorVigente(tx, actor, [
    "DEPARTMENT_EMPLOYEES.VIEW",
    ...(permiso ? [permiso] : []),
  ]);
  const id = gestor.empleado?.departamentoQueDirige?.id;
  const departamento = id
    ? await tx.departamento.findUnique({ where: { id } })
    : null;
  if (departamento?.estado !== "ACTIVO")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo el jefe vigente de un departamento activo puede ingresar.",
    });
  return { gestor, departamento };
}
