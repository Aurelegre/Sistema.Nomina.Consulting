import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
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
  listar: permissionProcedure("PAYROLL_PERIODS.VIEW").query(({ ctx }) =>
    listarPeriodosNomina(ctx.db),
  ),

  obtener: permissionProcedure("PAYROLL_PERIODS.VIEW")
    .input(periodoIdSchema)
    .query(({ ctx, input }) => obtenerPeriodoNomina(ctx.db, input.id)),

  crear: permissionProcedure("PAYROLL_PERIODS.CREATE")
    .input(crearPeriodoSchema)
    .mutation(({ ctx, input }) => crearPeriodoNomina(ctx.db, input)),

  cerrar: permissionProcedure("PAYROLL_PERIODS.CLOSE")
    .input(periodoIdSchema)
    .mutation(({ ctx, input }) => cerrarPeriodoNomina(ctx.db, input.id)),
});
