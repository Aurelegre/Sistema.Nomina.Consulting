import type { Departamento } from "./departamentos.model";

export type DeactivateDepartamentoProps = {
  departamento: Departamento;
  onCerrar: () => void;
  onGuardado: () => void;
};
