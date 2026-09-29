import type { TipoNovedad } from "../Models/novedades.model";
export const etiquetasNovedad: Record<TipoNovedad, string> = {
  HORAS_EXTRAS: "Horas extras",
  HORAS_DOBLES: "Horas dobles",
  PIEZAS: "Piezas fabricadas",
  VENTAS: "Ventas",
};
export function etiquetaPeriodo(periodo: {
  mes: number;
  anio: number;
  estado: string;
}) {
  return `${String(periodo.mes).padStart(2, "0")}/${periodo.anio} · ${periodo.estado === "ABIERTO" ? "Abierto" : "Cerrado"}`;
}
