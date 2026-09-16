import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import { editarDepartamentoSchema } from "./Models/departamentos.schema";
import {
  editarDepartamento,
  listarDepartamentos,
} from "./departamentos.service";

export const departamentosRouter = createTRPCRouter({
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
