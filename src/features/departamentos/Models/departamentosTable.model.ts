import type { Departamento } from "./departamentos.model";

export type DepartamentosTableProps = {
  departamentos: Departamento[];
  puedeEditar: boolean;
  actualizando: boolean;
  onEditar: (departamento: Departamento) => void;
  onDesactivar: (departamento: Departamento) => void;
};
