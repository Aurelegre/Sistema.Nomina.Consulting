import type { Salidas as RouterOutputs } from "~/shared/Models/acceso.model";
export type ContextoNovedades = RouterOutputs["novedades"]["contexto"];
export type EmpleadoDepartamento =
  RouterOutputs["novedades"]["listar"]["filas"][number];
export type TipoNovedad = ContextoNovedades["tipos"][number];
