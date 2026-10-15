import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type z } from "zod";
import { type estadoSchema, type paginaSchema } from "~/shared/acceso-schemas";
import {
  actorVigente,
  transaccionAcceso,
  comprobarVersion,
  comprobarRolAdministrable,
  puedeAdministrarRol,
  prohibido,
} from "../permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "../permisos/Models/ActorAcceso.Model";
import { rolConPermisos } from "./Models/RolConPermisos.model";
import type { crearRolSchema } from "./Models/crearRol.schema";
import type { editarRolSchema } from "./Models/editarRol.Schema";
import type { permisosRolSchema } from "./Models/permisoRol.schema";

export async function listarRoles(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof paginaSchema>,
) {
  const gestor = await actorVigente(db, actor, ["ROLES.VIEW"]);
  const where = {
    OR: [
      { nombre: { contains: input.busqueda } },
      { codigo: { contains: input.busqueda } },
    ],
  };
  const [total, filas] = await db.$transaction([
    db.rol.count({ where }),
    db.rol.findMany({
      where,
      include: { ...rolConPermisos, _count: { select: { usuarios: true } } },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (input.pagina - 1) * input.tamano,
      take: input.tamano,
    }),
  ]);
  return {
    total,
    filas: filas.map(({ permisos, _count, ...rol }) => ({
      ...rol,
      codigos: permisos.map(({ permiso }) => permiso.codigo),
      cantidadUsuarios: _count.usuarios,
      administrable:
        rol.codigo !== "ADMINISTRADOR" &&
        puedeAdministrarRol(gestor, { ...rol, permisos }) &&
        (gestor.administrador || gestor.rolId !== rol.id),
    })),
  };
}

export async function opcionesRoles(
  db: PrismaClient,
  actor: ActorAcceso,
  asignables: boolean,
) {
  const gestor = await actorVigente(db, actor, [
    asignables ? "USERS.ASSIGN_ROLE" : "USERS.VIEW",
  ]);
  const roles = await db.rol.findMany({
    where: asignables ? { estado: "ACTIVO" } : {},
    include: rolConPermisos,
    orderBy: { nombre: "asc" },
  });
  return roles
    .filter((rol) => !asignables || puedeAdministrarRol(gestor, rol))
    .map(({ id, nombre, codigo, estado }) => ({ id, nombre, codigo, estado }));
}

export async function crearRol(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof crearRolSchema>,
) {
  return transaccionAcceso(db, actor, ["ROLES.MANAGE"], async (tx) => {
    if (input.codigo === "ADMINISTRADOR")
      prohibido("El rol administrador está reservado");
    return tx.rol.create({ data: input });
  });
}

export async function editarRol(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof editarRolSchema>,
) {
  return transaccionAcceso(db, actor, ["ROLES.MANAGE"], async (tx, gestor) => {
    const rol = await tx.rol.findUnique({
      where: { id: input.id },
      include: rolConPermisos,
    });
    if (!rol)
      throw new TRPCError({ code: "NOT_FOUND", message: "Rol no encontrado" });
    comprobarVersion(rol.version, input.version);
    comprobarRolAdministrable(gestor, rol);
    if (
      rol.codigo === "ADMINISTRADOR" ||
      (!gestor.administrador && rol.id === gestor.rolId)
    )
      prohibido("Este rol está protegido");
    return tx.rol.update({
      where: { id: input.id, version: input.version },
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        version: { increment: 1 },
      },
    });
  });
}

export async function cambiarEstadoRol(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof estadoSchema>,
) {
  return transaccionAcceso(db, actor, ["ROLES.MANAGE"], async (tx, gestor) => {
    const rol = await tx.rol.findUnique({
      where: { id: input.id },
      include: rolConPermisos,
    });
    if (!rol)
      throw new TRPCError({ code: "NOT_FOUND", message: "Rol no encontrado" });
    comprobarVersion(rol.version, input.version);
    comprobarRolAdministrable(gestor, rol);
    if (
      rol.codigo === "ADMINISTRADOR" ||
      (!gestor.administrador && rol.id === gestor.rolId)
    )
      prohibido("Este rol está protegido");
    if (
      input.estado === "INACTIVO" &&
      (await tx.usuario.count({ where: { rolId: rol.id, estado: "ACTIVO" } }))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Reasigna o desactiva primero los usuarios activos de este rol",
      });
    const actualizado = await tx.rol.update({
      where: { id: input.id, version: input.version },
      data: { estado: input.estado, version: { increment: 1 } },
    });
    await tx.sesion.deleteMany({ where: { usuario: { rolId: rol.id } } });
    await tx.usuario.updateMany({
      where: { rolId: rol.id },
      data: { version: { increment: 1 } },
    });
    return actualizado;
  });
}

export async function guardarPermisosRol(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof permisosRolSchema>,
) {
  return transaccionAcceso(db, actor, ["ROLES.MANAGE"], async (tx, gestor) => {
    const rol = await tx.rol.findUnique({
      where: { id: input.id },
      include: rolConPermisos,
    });
    if (!rol)
      throw new TRPCError({ code: "NOT_FOUND", message: "Rol no encontrado" });
    comprobarVersion(rol.version, input.version);
    comprobarRolAdministrable(gestor, rol);
    if (
      rol.codigo === "ADMINISTRADOR" ||
      (!gestor.administrador && rol.id === gestor.rolId)
    )
      prohibido("Este rol está protegido");
    if (
      !gestor.administrador &&
      input.codigos.some((codigo) => !gestor.permisos.includes(codigo))
    )
      prohibido();
    const permisos = await tx.permiso.findMany({
      where: { codigo: { in: input.codigos } },
    });
    if (permisos.length !== input.codigos.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "El catálogo no está actualizado. Ejecuta el seed de permisos.",
      });
    await tx.rol.update({
      where: { id: input.id, version: input.version },
      data: { version: { increment: 1 } },
    });
    await tx.rolPermiso.deleteMany({ where: { rolId: rol.id } });
    if (permisos.length)
      await tx.rolPermiso.createMany({
        data: permisos.map(({ id }) => ({ rolId: rol.id, permisoId: id })),
      });
    await tx.sesion.deleteMany({ where: { usuario: { rolId: rol.id } } });
    await tx.usuario.updateMany({
      where: { rolId: rol.id },
      data: { version: { increment: 1 } },
    });
    return { ok: true };
  });
}
