import { createTRPCRouter, permissionProcedure } from "../api/trpc";
import { estadoSchema, registroVersionSchema } from "~/shared/acceso-schemas";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  asignarRolUsuario,
  cambiarEstadoUsuario,
  restablecerPassword,
} from "./usuarios.service";
import { opcionesRoles } from "../Rol/roles.service";
import {
  asignarRolSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  listarUsuariosSchema,
} from "./Models/usuarios.schema";

export const usuariosRouter = createTRPCRouter({
  listar: permissionProcedure("USERS.VIEW")
    .input(listarUsuariosSchema)
    .query(({ ctx, input }) =>
      listarUsuarios(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  rolesFiltro: permissionProcedure("USERS.VIEW").query(({ ctx }) =>
    opcionesRoles(
      ctx.db,
      { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
      false,
    ),
  ),
  rolesAsignables: permissionProcedure("USERS.ASSIGN_ROLE").query(({ ctx }) =>
    opcionesRoles(
      ctx.db,
      { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
      true,
    ),
  ),
  crear: permissionProcedure("USERS.CREATE")
    .input(crearUsuarioSchema)
    .mutation(({ ctx, input }) =>
      crearUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  editar: permissionProcedure("USERS.UPDATE")
    .input(editarUsuarioSchema)
    .mutation(({ ctx, input }) =>
      editarUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  asignarRol: permissionProcedure("USERS.ASSIGN_ROLE")
    .input(asignarRolSchema)
    .mutation(({ ctx, input }) =>
      asignarRolUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  cambiarEstado: permissionProcedure("USERS.DISABLE")
    .input(estadoSchema)
    .mutation(({ ctx, input }) =>
      cambiarEstadoUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  restablecerPassword: permissionProcedure("USERS.RESET_PASSWORD")
    .input(registroVersionSchema)
    .mutation(({ ctx, input }) =>
      restablecerPassword(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
