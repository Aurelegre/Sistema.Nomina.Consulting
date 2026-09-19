import { createTRPCRouter, permissionProcedure } from "../api/trpc";
import {
  crearEmpleado,
  despedirEmpleado,
  editarEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  recontratarEmpleado,
} from "./empleados.service";
import {
  crearEmpleadoSchema,
  desactivarEmpleadoSchema,
  editarEmpleadoSchema,
  listarEmpleadosSchema,
  obtenerEmpleadoSchema,
  reactivarEmpleadoSchema,
} from "./Models/empleados.schema";

export const empleadosRouter = createTRPCRouter({
  listar: permissionProcedure("EMPLOYEES.VIEW")
    .input(listarEmpleadosSchema)
    .query(({ ctx, input }) =>
      listarEmpleados(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),

  editar: permissionProcedure("EMPLOYEES.UPDATE")
    .input(editarEmpleadoSchema)
    .mutation(({ ctx, input }) =>
      editarEmpleado(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),

  despedir: permissionProcedure("EMPLOYEES.UPDATE")
    .input(desactivarEmpleadoSchema)
    .mutation(({ ctx, input }) =>
      despedirEmpleado(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),

  recontratar: permissionProcedure("EMPLOYEES.UPDATE")
    .input(reactivarEmpleadoSchema)
    .mutation(({ ctx, input }) =>
      recontratarEmpleado(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),

  crear: permissionProcedure("EMPLOYEES.CREATE")
    .input(crearEmpleadoSchema)
    .mutation(({ ctx, input }) =>
      crearEmpleado(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),

  buscar: permissionProcedure("EMPLOYEES.VIEW")
    .input(obtenerEmpleadoSchema)
    .query(({ ctx, input }) =>
      obtenerEmpleado(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
