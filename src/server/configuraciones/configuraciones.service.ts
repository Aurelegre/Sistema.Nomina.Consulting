import { type PrismaClient, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  catalogoConfiguraciones,
  editarConfiguracionSchema,
  valorValido,
  type ClaveConfiguracion,
} from "~/shared/configuraciones.schema";
import {
  actorVigente,
  transaccionAcceso,
  conflicto,
} from "~/server/permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { validar } from "~/shared/validar.helper";
type Db = PrismaClient | Prisma.TransactionClient;
export async function leerConfiguraciones(db: Db) {
  const filas = await db.configuracion.findMany();
  const valores = {} as Record<ClaveConfiguracion, number>;
  for (const [clave, regla] of Object.entries(catalogoConfiguraciones)) {
    const fila = filas.find((f) => f.clave === clave);
    if (!fila || !valorValido(fila.valor, regla))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Configuración inválida o ausente: ${clave}.`,
      });
    valores[clave as ClaveConfiguracion] = Number(fila.valor);
  }
  if (!(
    valores.comisionLimite1 < valores.comisionLimite2 &&
    valores.comisionLimite2 < valores.comisionLimite3
  ))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Los límites de comisión deben estar en orden ascendente.",
    });
  return valores;
}
export async function listarConfiguraciones(
  db: PrismaClient,
  actor: ActorAcceso,
) {
  const gestor = await actorVigente(db, actor, ["SETTINGS.VIEW"]);
  const filas = await db.configuracion.findMany({ orderBy: { id: "asc" } });
  return {
    puedeEditar: gestor.permisos.includes("SETTINGS.MANAGE"),
    filas: filas.map((f) => ({
      ...f,
      regla: catalogoConfiguraciones[f.clave as ClaveConfiguracion] ?? null,
    })),
  };
}
export async function editarConfiguracion(
  db: PrismaClient,
  actor: ActorAcceso,
  input: unknown,
) {
  const data = validar(editarConfiguracionSchema, input);
  return transaccionAcceso(
    db,
    actor,
    ["SETTINGS.VIEW", "SETTINGS.MANAGE"],
    async (tx) => {
      const actual = await tx.configuracion.findUnique({
        where: { id: data.id },
      });
      if (actual?.version !== data.version) throw conflicto();
      const regla = catalogoConfiguraciones[actual.clave as ClaveConfiguracion];
      if (!regla || !valorValido(data.valor, regla))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El valor no cumple el rango o precisión permitidos.",
        });
      await tx.configuracion.update({
        where: { id: data.id },
        data: {
          valor: String(Number(data.valor)),
          version: { increment: 1 },
          actualizadoPor: actor.usuarioId,
        },
      });
      await leerConfiguraciones(tx);
      return { ok: true };
    },
  );
}

