import { createTRPCRouter, permissionProcedure } from "../api/trpc";
import { paginaSchema, estadoSchema } from "~/shared/acceso-schemas";
import {
  listarRoles,
  crearRol,
  editarRol,
  cambiarEstadoRol,
  guardarPermisosRol,
} from "./roles.service";
import { listarPermisos } from "~/server/permisos/permisos.service";
import { crearRolSchema } from "./Models/crearRol.schema";
import { editarRolSchema } from "./Models/editarRol.Schema";
import { permisosRolSchema } from "./Models/permisoRol.schema";

export const rolesRouter = createTRPCRouter({
  listar: permissionProcedure("ROLES.VIEW")
    .input(paginaSchema)
    .query(({ ctx, input }) =>
      listarRoles(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  catalogoAsignable: permissionProcedure("ROLES.MANAGE").query(({ ctx }) =>
    listarPermisos(
      ctx.db,
      { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
      true,
    ),
  ),
  crear: permissionProcedure("ROLES.MANAGE")
    .input(crearRolSchema)
    .mutation(({ ctx, input }) =>
      crearRol(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  editar: permissionProcedure("ROLES.MANAGE")
    .input(editarRolSchema)
    .mutation(({ ctx, input }) =>
      editarRol(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  cambiarEstado: permissionProcedure("ROLES.MANAGE")
    .input(estadoSchema)
    .mutation(({ ctx, input }) =>
      cambiarEstadoRol(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  guardarPermisos: permissionProcedure("ROLES.MANAGE")
    .input(permisosRolSchema)
    .mutation(({ ctx, input }) =>
      guardarPermisosRol(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
