import { randomBytes } from "node:crypto";
import { type PrismaClient, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  asignarEmpleadoSchema,
  crearUsuarioSchema,
} from "./Models/usuarios.schema";
import { comprobarEmpleadoDisponible } from "./empleados-usuario.service";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { validar } from "~/shared/validar.helper";
import { type z } from "zod";
import {
  type estadoSchema,
  type registroVersionSchema,
} from "~/shared/acceso-schemas";
import { hashPassword } from "../sesion/Helpers/password";
import {
  transaccionAcceso,
  actorVigente,
  comprobarRolAdministrable,
  puedeAdministrarRol,
  prohibido,
} from "../permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "../permisos/Models/ActorAcceso.Model";
import { seleccionUsuario } from "../permisos/Models/seleccionUsuario.model";
import { rolConPermisos } from "../Rol/Models/RolConPermisos.model";
import {
  conservarAdministrador,
  usuarioObjetivo,
} from "./Helpers/usuario.helper";
import type {
  AsignarEmpleadoInput,
  asignarRolSchema,
  editarUsuarioSchema,
  listarUsuariosSchema,
} from "./Models/usuarios.schema";
import { empleadoAsignadoUsuario } from "../empleados/Models/empleadoasignadousuario.model";

export async function listarUsuarios(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof listarUsuariosSchema>,
) {
  const gestor = await actorVigente(db, actor, ["USERS.VIEW"]);
  const where: Prisma.UsuarioWhereInput = {
    estado: input.estado,
    rolId: input.rolId,
    OR: [
      { nombre: { contains: input.busqueda } },
      { username: { contains: input.busqueda } },
    ],
  };
  const [total, filas] = await db.$transaction([
    db.usuario.count({ where }),
    db.usuario.findMany({
      where,
      select: {
        ...seleccionUsuario,
        rol: { include: rolConPermisos },
        empleado: { select: empleadoAsignadoUsuario },
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (input.pagina - 1) * input.tamano,
      take: input.tamano,
    }),
  ]);
  return {
    total,
    filas: filas.map(({ rol, ...usuario }) => ({
      ...usuario,
      rol: {
        id: rol.id,
        codigo: rol.codigo,
        nombre: rol.nombre,
        estado: rol.estado,
      },
      administrable: puedeAdministrarRol(gestor, rol),
      empleado: usuario.empleado,
    })),
  };
}

export async function crearUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof crearUsuarioSchema>,
) {
  const data = validar(crearUsuarioSchema, input);
  const passwordTemporal = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(passwordTemporal);
  return transaccionOrganizacion(db, (tx) =>
    transaccionAcceso(
      tx,
      actor,
      [
        "USERS.CREATE",
        "USERS.ASSIGN_ROLE",
        ...(data.empleadoId ? ["USERS.ASSIGN_EMPLOYEE" as const] : []),
      ],
      async (tx, gestor) => {
        const rol = await tx.rol.findUnique({
          where: { id: data.rolId },
          include: rolConPermisos,
        });
        if (rol?.estado !== "ACTIVO")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selecciona un rol activo",
          });
        comprobarRolAdministrable(gestor, rol);
        if (data.empleadoId)
          await comprobarEmpleadoDisponible(tx, data.empleadoId);
        const usuario = await tx.usuario.create({
          data: { ...data, passwordHash, debeCambiarPassword: true },
          select: seleccionUsuario,
        });
        return { usuario, passwordTemporal };
      },
    ),
  );
}

export async function editarUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof editarUsuarioSchema>,
) {
  return transaccionAcceso(db, actor, ["USERS.UPDATE"], async (tx, gestor) => {
    const usuario = await usuarioObjetivo(tx, input.id, input.version);
    comprobarRolAdministrable(gestor, usuario.rol);
    const actualizado = await tx.usuario.update({
      where: { id: input.id, version: input.version },
      data: {
        username: input.username,
        nombre: input.nombre,
        version: { increment: 1 },
      },
      select: seleccionUsuario,
    });
    if (usuario.username !== input.username) {
      await tx.sesion.deleteMany({ where: { usuarioId: usuario.id } });
      await tx.intentoLogin.deleteMany({
        where: { username: { in: [usuario.username, input.username] } },
      });
    }
    return actualizado;
  });
}

export async function asignarRolUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof asignarRolSchema>,
) {
  return transaccionAcceso(
    db,
    actor,
    ["USERS.ASSIGN_ROLE"],
    async (tx, gestor) => {
      const usuario = await usuarioObjetivo(tx, input.id, input.version);
      if (usuario.id === gestor.id)
        prohibido("No puedes cambiar tu propio rol");
      comprobarRolAdministrable(gestor, usuario.rol);
      const rol = await tx.rol.findUnique({
        where: { id: input.rolId },
        include: rolConPermisos,
      });
      if (rol?.estado !== "ACTIVO")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecciona un rol activo",
        });
      comprobarRolAdministrable(gestor, rol);
      if (
        usuario.rol.codigo === "ADMINISTRADOR" &&
        rol.codigo !== "ADMINISTRADOR" &&
        usuario.estado === "ACTIVO"
      )
        await conservarAdministrador(tx);
      const actualizado = await tx.usuario.update({
        where: { id: input.id, version: input.version },
        data: { rolId: input.rolId, version: { increment: 1 } },
        select: seleccionUsuario,
      });
      await tx.sesion.deleteMany({ where: { usuarioId: usuario.id } });
      return actualizado;
    },
  );
}

export async function cambiarEstadoUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof estadoSchema>,
) {
  return transaccionAcceso(db, actor, ["USERS.DISABLE"], async (tx, gestor) => {
    const usuario = await usuarioObjetivo(tx, input.id, input.version);
    if (usuario.id === gestor.id)
      prohibido("No puedes cambiar tu propio estado");
    comprobarRolAdministrable(gestor, usuario.rol);
    if (input.estado === "ACTIVO" && usuario.rol.estado !== "ACTIVO")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Asigna primero un rol activo",
      });
    if (
      input.estado === "INACTIVO" &&
      usuario.estado === "ACTIVO" &&
      usuario.rol.codigo === "ADMINISTRADOR"
    )
      await conservarAdministrador(tx);
    const actualizado = await tx.usuario.update({
      where: { id: input.id, version: input.version },
      data: { estado: input.estado, version: { increment: 1 } },
      select: seleccionUsuario,
    });
    await tx.sesion.deleteMany({ where: { usuarioId: usuario.id } });
    return actualizado;
  });
}

export async function restablecerPassword(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.infer<typeof registroVersionSchema>,
) {
  const passwordTemporal = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(passwordTemporal);
  return transaccionAcceso(
    db,
    actor,
    ["USERS.RESET_PASSWORD"],
    async (tx, gestor) => {
      const usuario = await usuarioObjetivo(tx, input.id, input.version);
      comprobarRolAdministrable(gestor, usuario.rol);
      await tx.usuario.update({
        where: { id: input.id, version: input.version },
        data: {
          passwordHash,
          debeCambiarPassword: true,
          version: { increment: 1 },
        },
      });
      await tx.sesion.deleteMany({ where: { usuarioId: usuario.id } });
      await tx.intentoLogin.deleteMany({
        where: { username: usuario.username },
      });
      return {
        username: usuario.username,
        passwordTemporal,
        propiaCuenta: usuario.id === gestor.id,
      };
    },
  );
}

export async function asignarEmpleadoUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: AsignarEmpleadoInput,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await tx.$queryRaw`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
    const gestor = await actorVigente(tx, actor, ["USERS.ASSIGN_EMPLOYEE"]);
    const data = validar(asignarEmpleadoSchema, input);
    if (data.id === gestor.id)
      prohibido("No puedes cambiar tu propio vínculo con un empleado.");
    const usuario = await usuarioObjetivo(tx, data.id, data.version);
    comprobarRolAdministrable(gestor, usuario.rol);
    if (data.empleadoId !== null) {
      await comprobarEmpleadoDisponible(tx, data.empleadoId, data.id);
    }
    const actualizado = await tx.usuario.update({
      where: { id: data.id, version: data.version },
      data: { empleadoId: data.empleadoId, version: { increment: 1 } },
      select: { id: true, version: true, empleadoId: true },
    });
    await tx.sesion.deleteMany({ where: { usuarioId: data.id } });
    return actualizado;
  });
}
