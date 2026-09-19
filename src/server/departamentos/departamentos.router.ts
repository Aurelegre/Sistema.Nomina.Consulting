import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import {
  crearDepartamentoSchema,
  desactivarDepartamentoSchema,
  editarDepartamentoSchema,
} from "./Models/departamentos.schema";
import {
  editarDepartamento,
  jefesDisponibles,
  listarDepartamentos,
  crearDepartamento,
  desactivarDepartamento,
  reactivarDepartamento,
} from "./departamentos.service";

export const departamentosRouter = createTRPCRouter({
  jefesDisponibles: permissionProcedure("DEPARTMENTS.MANAGE").query(({ ctx }) =>
    jefesDisponibles(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  crear: permissionProcedure("DEPARTMENTS.MANAGE")
    .input(crearDepartamentoSchema)
    .mutation(({ ctx, input }) =>
      crearDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  desactivar: permissionProcedure("DEPARTMENTS.MANAGE")
    .input(desactivarDepartamentoSchema)
    .mutation(({ ctx, input }) =>
      desactivarDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  reactivar: permissionProcedure("DEPARTMENTS.MANAGE")
    .input(desactivarDepartamentoSchema)
    .mutation(({ ctx, input }) =>
      reactivarDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  listar: permissionProcedure("DEPARTMENTS.VIEW").query(({ ctx }) =>
    listarDepartamentos(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  editar: permissionProcedure("DEPARTMENTS.MANAGE")
    .input(editarDepartamentoSchema)
    .mutation(({ ctx, input }) =>
      editarDepartamento(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
