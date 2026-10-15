import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  comprobarVersion,
  prohibido,
} from "~/server/permisos/Helpers/acceso-policy";
import { rolConPermisos } from "~/server/Rol/Models/RolConPermisos.model";

export async function usuarioObjetivo(
  tx: Prisma.TransactionClient,
  id: number,
  version: number,
) {
  const usuario = await tx.usuario.findUnique({
    where: { id },
    include: { rol: { include: rolConPermisos } },
  });
  if (!usuario)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuario no encontrado",
    });
  comprobarVersion(usuario.version, version);
  return usuario;
}

export async function conservarAdministrador(tx: Prisma.TransactionClient) {
  const cantidad = await tx.usuario.count({
    where: {
      estado: "ACTIVO",
      rol: { codigo: "ADMINISTRADOR", estado: "ACTIVO" },
    },
  });
  if (cantidad <= 1)
    prohibido("Debe permanecer al menos un administrador activo");
}
