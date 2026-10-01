import {
  createTRPCRouter,
  permissionProcedure,
  anyPermissionProcedure,
} from "~/server/api/trpc";
import {
  contextoCompras,
  empleadosCompra,
  listarCompras,
  crearCompra,
  editarCompra,
  eliminarCompra,
} from "./compras-solidarias.service";
import {
  crearCompraSchema,
  editarCompraSchema,
  eliminarCompraSchema,
  empleadosCompraSchema,
  listarComprasSchema,
} from "./Models/compras-solidarias.schema";
export const comprasSolidariasRouter = createTRPCRouter({
  contexto: anyPermissionProcedure([
    "ASSOCIATION.PURCHASES.VIEW",
    "ASSOCIATION.PURCHASES.CREATE",
  ]).query(({ ctx }) =>
    contextoCompras(ctx.db, {
      usuarioId: ctx.sesion.usuario.id,
      sesionId: ctx.sesion.id,
    }),
  ),
  listar: permissionProcedure("ASSOCIATION.PURCHASES.VIEW")
    .input(listarComprasSchema)
    .query(({ ctx, input }) =>
      listarCompras(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  empleados: permissionProcedure("ASSOCIATION.PURCHASES.CREATE")
    .input(empleadosCompraSchema)
    .query(({ ctx, input }) =>
      empleadosCompra(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
        true,
      ),
    ),
  empleadosFiltro: permissionProcedure("ASSOCIATION.PURCHASES.VIEW")
    .input(empleadosCompraSchema)
    .query(({ ctx, input }) =>
      empleadosCompra(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
        false,
      ),
    ),
  crear: permissionProcedure("ASSOCIATION.PURCHASES.CREATE")
    .input(crearCompraSchema)
    .mutation(({ ctx, input }) =>
      crearCompra(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  editar: permissionProcedure("ASSOCIATION.PURCHASES.UPDATE")
    .input(editarCompraSchema)
    .mutation(({ ctx, input }) =>
      editarCompra(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
  eliminar: permissionProcedure("ASSOCIATION.PURCHASES.DELETE")
    .input(eliminarCompraSchema)
    .mutation(({ ctx, input }) =>
      eliminarCompra(
        ctx.db,
        { usuarioId: ctx.sesion.usuario.id, sesionId: ctx.sesion.id },
        input,
      ),
    ),
});
