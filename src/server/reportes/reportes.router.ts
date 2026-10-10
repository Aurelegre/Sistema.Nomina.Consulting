import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import {
  periodoPolizaSchema,
  generarPolizaSchema,
  exportarPolizaSchema,
} from "./Models/poliza.schema";
import * as servicio from "./reportes.service";
export const reportesRouter = createTRPCRouter({
  contexto: permissionProcedure("ACCOUNTING_POLICY.VIEW").query(({ ctx }) =>
    servicio.contextoReportes(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  previa: permissionProcedure("ACCOUNTING_POLICY.VIEW")
    .input(periodoPolizaSchema)
    .query(({ ctx, input }) =>
      servicio.vistaPreviaPoliza(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  generar: permissionProcedure("ACCOUNTING_POLICY.GENERATE")
    .input(generarPolizaSchema)
    .mutation(({ ctx, input }) =>
      servicio.generarPoliza(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  exportar: permissionProcedure("ACCOUNTING_POLICY.EXPORT")
    .input(exportarPolizaSchema)
    .mutation(({ ctx, input }) =>
      servicio.exportarPoliza(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
