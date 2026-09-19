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
  const existente = await db.periodoNomina.findFirst({
    where: {
      mes: input.mes,
      anio: input.anio,
    },
    select: { id: true },
  });

  if (existente) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Ya existe un período de nómina para el mes y año seleccionados.",
    });
  }

  try {
    return await db.periodoNomina.create({
      data: {
        mes: input.mes,
        anio: input.anio,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Ya existe un período de nómina para el mes y año seleccionados.",
      });
    }

    throw error;
  }
};

export const cerrarPeriodoNomina = async (db: PrismaClient, id: number) => {
  return transaccionOrganizacion(db, async (tx) => {
    const periodo = await tx.periodoNomina.findUnique({ where: { id } });
    if (!periodo)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "El período de nómina no existe.",
      });

    if (periodo.estado === "CERRADO") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El período de nómina ya se encuentra cerrado.",
      });
    }

    return tx.periodoNomina.update({
      where: { id },
      data: {
        estado: "CERRADO",
        fechaCierre: new Date(),
      },
    });
  });
};
