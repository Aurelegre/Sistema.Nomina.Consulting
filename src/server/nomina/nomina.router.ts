import {
  createTRPCRouter,
  protectedProcedure,
  permissionProcedure,
} from "~/server/api/trpc";
import {
  filtroNominaSchema,
  generarNominaSchema,
  detalleNominaSchema,
  idNominaSchema,
} from "./Models/nomina.schema";
import * as servicio from "./nomina.service";

export const nominaRouter = createTRPCRouter({
  contexto: protectedProcedure.query(({ ctx }) =>
    servicio.contextoNomina(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  generar: permissionProcedure("PAYROLL.PROCESS")
    .input(generarNominaSchema)
    .mutation(({ ctx, input }) =>
      servicio.solicitarNomina(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  listar: permissionProcedure("PAYROLL.VIEW")
    .input(filtroNominaSchema)
    .query(({ ctx, input }) =>
      servicio.listarNominas(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  detalle: permissionProcedure("PAYROLL.DETAIL")
    .input(detalleNominaSchema)
    .query(({ ctx, input }) =>
      servicio.detalleNomina(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  exportar: permissionProcedure("PAYROLL.EXPORT")
    .input(idNominaSchema)
    .mutation(({ ctx, input }) =>
      servicio.exportarNomina(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  misNominas: protectedProcedure
    .input(filtroNominaSchema)
    .query(({ ctx, input }) =>
      servicio.listarNominas(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
        true,
      ),
    ),
  miDetalle: protectedProcedure
    .input(detalleNominaSchema)
    .query(({ ctx, input }) =>
      servicio.detalleNomina(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
        true,
      ),
    ),
  notificaciones: protectedProcedure.query(({ ctx }) =>
    servicio.notificacionesNomina(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  leerNotificacion: protectedProcedure
    .input(idNominaSchema)
    .mutation(({ ctx, input }) =>
      servicio.leerNotificacionNomina(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  ejecuciones: permissionProcedure("PAYROLL.PROCESS").query(({ ctx }) =>
    servicio.ejecucionesPropias(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
});
