import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import {
  contextoNovedades,
  detalleEmpleadoDepartamento,
  listarEmpleadosDepartamento,
  registrarNovedad,
} from "./novedades.service";
import {
  detalleNovedadesSchema,
  listarNovedadesSchema,
  registrarNovedadSchema,
} from "./Models/novedades.schema";

export const novedadesRouter = createTRPCRouter({
  contexto: permissionProcedure("DEPARTMENT_EMPLOYEES.VIEW").query(({ ctx }) =>
    contextoNovedades(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  listar: permissionProcedure("DEPARTMENT_EMPLOYEES.VIEW")
    .input(listarNovedadesSchema)
    .query(({ ctx, input }) =>
      listarEmpleadosDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  detalle: permissionProcedure("DEPARTMENT_EMPLOYEES.DETAIL")
    .input(detalleNovedadesSchema)
    .query(({ ctx, input }) =>
      detalleEmpleadoDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  registrar: permissionProcedure("DEPARTMENT_EMPLOYEES.VIEW")
    .input(registrarNovedadSchema)
    .mutation(({ ctx, input }) =>
      registrarNovedad(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
