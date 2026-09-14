import type { Rol } from "./Rol.model";
export type RolesTableProps = {
  filas: Rol[] | undefined;
  cargando: boolean;
  pendiente: boolean;
  puedeGestionar: boolean;
  onEditar: (rol: Rol) => void;
  onPermisos: (rol: Rol) => void;
  onEstado: (rol: Rol) => void;
};
