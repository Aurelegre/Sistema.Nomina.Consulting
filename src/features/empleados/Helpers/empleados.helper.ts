export function fechaInput(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}
export function fechaEmpleado(fecha: Date | null) {
  return fecha
    ? new Intl.DateTimeFormat("es-GT", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(fecha)
    : "—";
}
export function salarioEmpleado(salario: string) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(Number(salario));
}
export function hoyGuatemala() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
