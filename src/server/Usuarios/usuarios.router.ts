import { createTRPCRouter, permissionProcedure } from "../api/trpc";
import { estadoSchema, registroVersionSchema } from "~/shared/acceso-schemas";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  asignarRolUsuario,
  cambiarEstadoUsuario,
  restablecerPassword,
  asignarEmpleadoUsuario,
} from "./usuarios.service";
import { opcionesRoles } from "../Rol/roles.service";
import {
  listarEmpleadosSinUsuario,
  departamentosAsignacion,
} from "./empleados-usuario.service";
import {
  asignarRolSchema,
  asignarEmpleadoSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  listarUsuariosSchema,
  empleadosSinUsuarioSchema,
} from "./Models/usuarios.schema";

export const usuariosRouter = createTRPCRouter({
  empleadosSinUsuario: permissionProcedure("USERS.ASSIGN_EMPLOYEE")
    .input(empleadosSinUsuarioSchema)
    .query(({ ctx, input }) =>
      listarEmpleadosSinUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  departamentosAsignacion: permissionProcedure("USERS.ASSIGN_EMPLOYEE").query(
    ({ ctx }) =>
      departamentosAsignacion(ctx.db, {
        usuarioId: ctx.sesion.usuario.id,
        sesionId: ctx.sesion.id,
      }),
  ),
  asignarEmpleado: permissionProcedure("USERS.ASSIGN_EMPLOYEE")
    .input(asignarEmpleadoSchema)
    .mutation(({ ctx, input }) =>
      asignarEmpleadoUsuario(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
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
