import { type PrismaClient } from "@prisma/client";
import { PERMISOS } from "~/server/permisos/Helpers/permisos";
import type { ActorAcceso } from "./Models/ActorAcceso.Model";
import { actorVigente } from "./Helpers/acceso-policy";

export async function listarPermisos(
  db: PrismaClient,
  actor: ActorAcceso,
  paraAsignar = false,
) {
  const gestor = await actorVigente(db, actor, [
    paraAsignar ? "ROLES.MANAGE" : "PERMISSIONS.VIEW",
  ]);
  const permisos = await db.permiso.findMany({
    where: { codigo: { in: Object.keys(PERMISOS) } },
    include: {
      roles: { select: { rol: { select: { id: true, nombre: true } } } },
    },
    orderBy: { codigo: "asc" },
  });
  return permisos.map(({ roles, ...permiso }) => ({
    ...permiso,
    modulo: permiso.codigo.split(".")[0]!,
    roles: paraAsignar ? [] : roles.map(({ rol }) => rol),
    asignable: gestor.administrador || gestor.permisos.includes(permiso.codigo),
  }));
}
