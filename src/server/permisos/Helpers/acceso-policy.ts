import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type CodigoPermiso } from "~/server/permisos/Helpers/permisos";
import type { ActorAcceso } from "../Models/ActorAcceso.Model";
import { rolConPermisos } from "~/server/Rol/Models/RolConPermisos.model";

export const conflicto = () =>
  new TRPCError({
    code: "CONFLICT",
    message: "El registro cambió. Recarga la lista y vuelve a intentarlo.",
  });
export function prohibido(
  message = "No puedes administrar un acceso superior al tuyo",
): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

// Todas las escrituras de seguridad toman primero el mismo bloqueo. Así dos
// administradores no pueden desactivar simultáneamente las últimas cuentas.
export function comprobarVersion(actual: number, esperada: number) {
  if (actual !== esperada) throw conflicto();
}

// Comprueba que el actor tenga los permisos requeridos y que la sesión esté vigente.
// Devuelve el gestor con los permisos del actor.
export async function actorVigente(
  tx: Prisma.TransactionClient,
  actor: ActorAcceso,
  permisos: CodigoPermiso[],
) {
  const sesion = await tx.sesion.findUnique({
    where: { id: actor.sesionId },
    include: {
      usuario: {
        include: {
          empleado: {
            select: {
              id: true,
              estado: true,
              departamentoId: true,
              fechaIngreso: true,
              departamentoQueDirige: { select: { id: true } },
            },
          },
          rol: { include: rolConPermisos },
        },
      },
    },
  });
  if (
    sesion?.usuarioId !== actor.usuarioId ||
    sesion.fechaExpiracion <= new Date() ||
    sesion.usuario.estado !== "ACTIVO" ||
    sesion.usuario.rol.estado !== "ACTIVO" ||
    (sesion.usuario.empleado !== null &&
      sesion.usuario.empleado.estado !== "ACTIVO")
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });
  if (sesion.usuario.debeCambiarPassword)
    prohibido("Debes cambiar tu contraseña temporal");
  const codigos = sesion.usuario.rol.permisos.map(
    ({ permiso }) => permiso.codigo,
  );
  if (!permisos.every((p) => codigos.includes(p)))
    prohibido("No tienes permiso para esta operación");
  return {
    id: sesion.usuarioId,
    empleado: sesion.usuario.empleado,
    rolId: sesion.usuario.rolId,
    administrador: sesion.usuario.rol.codigo === "ADMINISTRADOR",
    permisos: codigos,
  };
}
export type Gestor = Awaited<ReturnType<typeof actorVigente>>;
export function puedeAdministrarRol(
  gestor: Gestor,
  rol: { codigo: string; permisos: { permiso: { codigo: string } }[] },
) {
  return (
    gestor.administrador ||
    (rol.codigo !== "ADMINISTRADOR" &&
      rol.permisos.every(({ permiso }) =>
        gestor.permisos.includes(permiso.codigo),
      ))
  );
}
export function comprobarRolAdministrable(
  gestor: Gestor,
  rol: Parameters<typeof puedeAdministrarRol>[1],
) {
  if (!puedeAdministrarRol(gestor, rol)) prohibido();
}

// Todas las escrituras de seguridad toman primero el mismo bloqueo. Así dos
// administradores no pueden desactivar simultáneamente las últimas cuentas.
export async function transaccionAcceso<T>(
  db: PrismaClient | Prisma.TransactionClient,
  actor: ActorAcceso,
  permisos: CodigoPermiso[],
  operacion: (tx: Prisma.TransactionClient, gestor: Gestor) => Promise<T>,
): Promise<T> {
  try {
    const ejecutar = async (tx: Prisma.TransactionClient) => {
      const filas = await tx.$queryRaw<
        { id: number }[]
      >`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
      if (!filas.length)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Ejecuta el seed de seguridad antes de administrar accesos",
        });
      const gestor = await actorVigente(tx, actor, permisos);
      return operacion(tx, gestor);
    };
    return "$transaction" in db
      ? await db.$transaction(ejecutar, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 15000,
        })
      : await ejecutar(db);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un registro con ese usuario, código o nombre",
        });
      if (["P2034", "P2025"].includes(error.code)) throw conflicto();
    }
    throw error;
  }
}
