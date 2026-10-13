import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { editarConfiguracionSchema } from "~/shared/configuraciones.schema";
import {
  listarConfiguraciones,
  editarConfiguracion,
} from "./configuraciones.service";
export const configuracionesRouter = createTRPCRouter({
  listar: protectedProcedure.query(({ ctx }) =>
    listarConfiguraciones(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  editar: protectedProcedure
    .input(editarConfiguracionSchema)
    .mutation(({ ctx, input }) =>
      editarConfiguracion(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
