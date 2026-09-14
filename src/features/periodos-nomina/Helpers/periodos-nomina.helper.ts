export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
export const formatFecha = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("es-GT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "—";
export const formatPeriodo = (mes: number, anio: number) =>
  `${MESES[mes - 1] ?? "Mes"} ${anio}`;
