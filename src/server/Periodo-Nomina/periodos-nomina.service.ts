import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { CrearPeriodoInput } from "./Models/CrearPeriodoInput.model";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";

export const listarPeriodosNomina = (db: PrismaClient) =>
  db.periodoNomina.findMany({
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

export const obtenerPeriodoNomina = async (db: PrismaClient, id: number) => {
  const periodo = await db.periodoNomina.findUnique({
    where: { id },
  });

  if (!periodo) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "El período de nómina no existe.",
    });
  }

  return periodo;
};

export const crearPeriodoNomina = async (
  db: PrismaClient,
  input: CrearPeriodoInput,
) => {
  try {
    return await transaccionOrganizacion(db, async (tx) => {
      const abierto = await tx.periodoNomina.findFirst({
        where: { estado: "ABIERTO" },
      });
      if (abierto)
        throw new TRPCError({
          code: "CONFLICT",
          message: `Debes cerrar el período ${abierto.mes}/${abierto.anio} antes de crear otro.`,
        });
      const existente = await tx.periodoNomina.findUnique({
        where: { mes_anio: { mes: input.mes, anio: input.anio } },
      });
      if (existente)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Ya existe un período de nómina para el mes y año seleccionados.",
        });
      return tx.periodoNomina.create({
        data: { mes: input.mes, anio: input.anio },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Ya existe un período abierto o un período para ese mes y año. Actualiza la lista.",
      });
    }

    throw error;
  }
};
