import type { PeriodoSeleccionado } from "./periodos-nomina.model";
export type CerrarPeriodoProps = {
  periodo: PeriodoSeleccionado | null;
  onCancelar: () => void;
};
