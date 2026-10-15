import type { Ausencia } from "../Models/ausencias.model";
export const estadosAusencia: { value: Ausencia["estado"]; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "APLICADA_NOMINA", label: "Aplicada a nómina" },
];
export function estadoAusencia(estado: Ausencia["estado"]) {
  return estadosAusencia.find((e) => e.value === estado)?.label ?? estado;
}
export function fechaAusencia(fecha: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}
export function fechaRegistro(fecha: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}
export function cuentaSalario(ausencia: Ausencia) {
  return ausencia.estado === "PENDIENTE"
    ? "Por definir"
    : ausencia.aCuentaSalario
      ? "Sí"
      : "No";
}
