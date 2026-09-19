import type { Identidad, Salidas } from "~/shared/Models/acceso.model";
export type Empleado = Salidas["empleados"]["listar"]["filas"][number];
export type DetalleEmpleado = Salidas["empleados"]["buscar"];
export type EmpleadosViewProps = { identidad: Identidad };
export type ModalEmpleadoProps = {
  onCerrar: () => void;
  onGuardado: () => void;
};
export type EditorEmpleadoProps = ModalEmpleadoProps & { empleado?: Empleado };
export type ConfirmarEmpleadoProps = ModalEmpleadoProps & {
  empleado: Empleado;
  accion: "baja" | "recontratar";
};
export type EmpleadosTableProps = {
  empleados: Empleado[];
  puedeEditar: boolean;
  actualizando: boolean;
  onDetalle: (empleado: Empleado) => void;
  onEditar: (empleado: Empleado) => void;
  onEstado: (empleado: Empleado) => void;
};
