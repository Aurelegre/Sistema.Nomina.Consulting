import { createTRPCRouter, permissionProcedure } from "../api/trpc";
import { listarPermisos } from "./permisos.service";

export const permisosRouter = createTRPCRouter({
  listar: permissionProcedure("PERMISSIONS.VIEW").query(({ ctx }) =>
    listarPermisos(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
});
