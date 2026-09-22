import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import {
  crearAusencia,
  listarAusencias,
  obtenerAusencia,
  aprobarAusencia,
  rechazarAusencia,
  contextoAusencias,
  empleadosRevision,
} from "./ausencias.service";
import {
  crearAusenciaSchema,
  listarAusenciasSchema,
  obtenerAusenciaSchema,
  resolverAusenciaSchema,
} from "./Models/ausencias.schema";

// El servicio valida también invocaciones directas; las fechas viajan como AAAA-MM-DD.
export const ausenciasRouter = createTRPCRouter({
  contexto: permissionProcedure("ABSENCES.VIEW").query(({ ctx }) =>
    contextoAusencias(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  empleadosRevision: permissionProcedure("ABSENCES.VIEW").query(({ ctx }) =>
    empleadosRevision(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  crear: permissionProcedure("ABSENCES.CREATE")
    .input(crearAusenciaSchema)
    .mutation(({ ctx, input }) =>
      crearAusencia(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        {
          ...input,
          fechaInicio: input.fechaInicio.toISOString().slice(0, 10),
          fechaFin: input.fechaFin.toISOString().slice(0, 10),
        },
      ),
    ),
  listar: permissionProcedure("ABSENCES.VIEW")
    .input(listarAusenciasSchema)
    .query(({ ctx, input }) =>
      listarAusencias(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        {
          ...input,
          desde: input.desde?.toISOString().slice(0, 10),
          hasta: input.hasta?.toISOString().slice(0, 10),
          ingresadaDesde: input.ingresadaDesde?.toISOString().slice(0, 10),
          ingresadaHasta: input.ingresadaHasta?.toISOString().slice(0, 10),
        },
      ),
    ),
  obtener: permissionProcedure("ABSENCES.VIEW")
    .input(obtenerAusenciaSchema)
    .query(({ ctx, input }) =>
      obtenerAusencia(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  aprobar: permissionProcedure("ABSENCES.APPROVE")
    .input(resolverAusenciaSchema)
    .mutation(({ ctx, input }) =>
      aprobarAusencia(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  rechazar: permissionProcedure("ABSENCES.APPROVE")
    .input(resolverAusenciaSchema)
    .mutation(({ ctx, input }) =>
      rechazarAusencia(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
