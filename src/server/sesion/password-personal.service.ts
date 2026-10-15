import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import {
  actorVigente,
  transaccionAcceso,
} from "~/server/permisos/Helpers/acceso-policy";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { cambioPasswordSchema } from "~/shared/cambio-password.schema";
import { hashPassword, verificarPassword } from "./Helpers/password";
export async function cambiarPasswordPersonal(
  db: PrismaClient,
  actor: ActorAcceso,
  input: unknown,
) {
  await actorVigente(db, actor, []);
  const validado = cambioPasswordSchema.safeParse(input);
  if (!validado.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Revisa las contraseñas",
    });
  const { passwordActual, nuevaPassword } = validado.data;
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { id: actor.usuarioId },
    select: { passwordHash: true, version: true },
  });
  if (!(await verificarPassword(usuario.passwordHash, passwordActual)))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La contraseña actual no es correcta",
    });
  const passwordHash = await hashPassword(nuevaPassword);
  await transaccionOrganizacion(db, (tx) =>
    transaccionAcceso(tx, actor, [], async (tx) => {
      const cambio = await tx.usuario.updateMany({
        where: {
          id: actor.usuarioId,
          passwordHash: usuario.passwordHash,
          version: usuario.version,
        },
        data: { passwordHash, version: { increment: 1 } },
      });
      if (cambio.count !== 1)
        throw new TRPCError({
          code: "CONFLICT",
          message: "La cuenta cambió. Inicia sesión nuevamente.",
        });
      await tx.sesion.deleteMany({ where: { usuarioId: actor.usuarioId } });
    }),
  );
}
