import type { Salidas } from "~/shared/Models/acceso.model";
export type Ausencia = Salidas["ausencias"]["listar"]["filas"][number];
export type ContextoAusencias = Salidas["ausencias"]["contexto"];
export type AmbitoAusencias = "propias" | "departamento" | "todos";
export type AusenciasViewProps = {
  contextoInicial: ContextoAusencias;
  ambito: AmbitoAusencias;
};
export type ModalAusenciaProps = {
  onCerrar: () => void;
  onGuardado: () => void;
};
export type ResolucionAusenciaProps = ModalAusenciaProps & {
  ausencia: Ausencia;
  decision: "aprobar" | "rechazar";
};
export type AusenciasTableProps = {
  filas: Ausencia[];
  revision: boolean;
  ambito: AmbitoAusencias;
  puedeResolver: boolean;
  actualizando: boolean;
  onDetalle: (ausencia: Ausencia) => void;
  onResolver: (ausencia: Ausencia, decision: "aprobar" | "rechazar") => void;
};
