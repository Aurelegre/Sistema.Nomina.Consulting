import type { Salidas } from "~/shared/Models/acceso.model";
export type PermisosTableProps = {
  filas: Salidas["permisos"]["listar"];
  cargando: boolean;
};
