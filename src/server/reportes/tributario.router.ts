import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  tipoTributarioSchema,
  periodoTributarioSchema,
  generarTributarioSchema,
  exportarTributarioSchema,
} from "./Models/tributario.schema";
import * as servicio from "./tributario.service";
// Each service authorizes the specific type from validated input before any data access.
export const tributarioRouter = createTRPCRouter({
  contexto: protectedProcedure
    .input(tipoTributarioSchema)
    .query(({ ctx, input }) =>
      servicio.contextoTributario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  previa: protectedProcedure
    .input(periodoTributarioSchema)
    .query(({ ctx, input }) =>
      servicio.vistaPreviaTributario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  generar: protectedProcedure
    .input(generarTributarioSchema)
    .mutation(({ ctx, input }) =>
      servicio.generarTributario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  exportar: protectedProcedure
    .input(exportarTributarioSchema)
    .mutation(({ ctx, input }) =>
      servicio.exportarTributario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
