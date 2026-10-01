import type { Salidas } from "~/shared/Models/acceso.model";
export type Compra = Salidas["comprasSolidarias"]["listar"]["filas"][number];
export type EmpleadoCompra =
  Salidas["comprasSolidarias"]["empleados"]["filas"][number];
export type ContextoCompras = Salidas["comprasSolidarias"]["contexto"];
