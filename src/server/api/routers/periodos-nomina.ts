import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const crearPeriodoSchema = z.object({
  mes: z
    .number()
    .int()
    .min(1, "El mes debe estar entre 1 y 12")
    .max(12, "El mes debe estar entre 1 y 12"),
  anio: z.number().int().positive("El año debe ser mayor que cero"),
});

const periodoIdSchema = z.object({
  id: z.number().int().positive("El identificador del período no es válido"),
});

export const periodosNominaRouter = createTRPCRouter({
  listar: publicProcedure.query(({ ctx }) =>
    ctx.db.periodoNomina.findMany({
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    })
  ),

  obtener: publicProcedure.input(periodoIdSchema).query(async ({ ctx, input }) => {
    const periodo = await ctx.db.periodoNomina.findUnique({
      where: { id: input.id },
    });

    if (!periodo) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "El período de nómina no existe.",
      });
    }

    return periodo;
  }),

  crear: publicProcedure.input(crearPeriodoSchema).mutation(async ({ ctx, input }) => {
    const existente = await ctx.db.periodoNomina.findFirst({
      where: {
        mes: input.mes,
        anio: input.anio,
      },
      select: { id: true },
    });

    if (existente) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya existe un período de nómina para el mes y año seleccionados.",
      });
    }

    return ctx.db.periodoNomina.create({
      data: {
        mes: input.mes,
        anio: input.anio,
      },
    });
  }),

  cerrar: publicProcedure.input(periodoIdSchema).mutation(async ({ ctx, input }) => {
    const periodo = await ctx.db.periodoNomina.findUnique({
      where: { id: input.id },
    });

    if (!periodo) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "El período de nómina no existe.",
      });
    }

    if (periodo.estado === "CERRADO") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El período de nómina ya se encuentra cerrado.",
      });
    }

    return ctx.db.periodoNomina.update({
      where: { id: input.id },
      data: {
        estado: "CERRADO",
        fechaCierre: new Date(),
      },
    });
  }),
});
