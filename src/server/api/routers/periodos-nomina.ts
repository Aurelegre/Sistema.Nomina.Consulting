import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  cerrarPeriodoNomina,
  crearPeriodoNomina,
  listarPeriodosNomina,
  obtenerPeriodoNomina,
} from "~/server/services/periodos-nomina.service";

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
  listar: publicProcedure.query(({ ctx }) => listarPeriodosNomina(ctx.db)),

  obtener: publicProcedure
    .input(periodoIdSchema)
    .query(({ ctx, input }) => obtenerPeriodoNomina(ctx.db, input.id)),

  crear: publicProcedure
    .input(crearPeriodoSchema)
    .mutation(({ ctx, input }) => crearPeriodoNomina(ctx.db, input)),

  cerrar: publicProcedure
    .input(periodoIdSchema)
    .mutation(({ ctx, input }) => cerrarPeriodoNomina(ctx.db, input.id)),
});
