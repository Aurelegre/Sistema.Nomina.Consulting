import type { Salidas } from "~/shared/Models/acceso.model";
import type { Usuario } from "./Usuario.model";
export type EmpleadoAsignable =
  Salidas["usuarios"]["empleadosSinUsuario"]["filas"][number];

export type EditorEmpleadoUsuarioModalProps = {
  usuario?: Usuario;
  onCerrar: () => void;
  onAsignado: (empleado: EmpleadoAsignable) => void | Promise<void>;
};
