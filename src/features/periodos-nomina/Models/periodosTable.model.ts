import type {
  PeriodoNomina,
  PeriodoSeleccionado,
} from "./periodos-nomina.model";
export type PeriodosTableProps = {
  periodos: PeriodoNomina[];
  puedeCerrar: boolean;
  onCerrar: (periodo: PeriodoSeleccionado) => void;
};
