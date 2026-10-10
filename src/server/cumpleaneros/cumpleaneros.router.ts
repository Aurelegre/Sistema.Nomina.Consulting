import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  filtrosCumpleanerosSchema,
  exportarCumpleanerosSchema,
} from "./Models/cumpleaneros.schema";
import * as servicio from "./cumpleaneros.service";
export const cumpleanerosRouter = createTRPCRouter({
  contexto: protectedProcedure.query(({ ctx }) =>
    servicio.contextoCumpleaneros(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  listar: protectedProcedure
    .input(filtrosCumpleanerosSchema)
    .query(({ ctx, input }) =>
      servicio.listarCumpleaneros(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  exportar: protectedProcedure
    .input(exportarCumpleanerosSchema)
    .mutation(({ ctx, input }) =>
      servicio.exportarCumpleaneros(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
