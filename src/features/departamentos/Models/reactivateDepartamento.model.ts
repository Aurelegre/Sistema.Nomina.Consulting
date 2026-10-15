import type { Departamento } from "./departamentos.model";

export type ReactivateDepartamentoProps = {
  departamento: Departamento;
  onCerrar: () => void;
  onGuardado: () => void;
};
