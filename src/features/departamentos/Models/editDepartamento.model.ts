import type { Departamento } from "./departamentos.model";

export type EditDepartamentoProps = {
  departamento: Departamento;
  onCerrar: () => void;
  onGuardado: () => void;
};
