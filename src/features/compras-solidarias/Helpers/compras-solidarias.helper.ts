export function nombrePeriodo(p: {
  mes: number;
  anio: number;
  estado: string;
}) {
  return `${String(p.mes).padStart(2, "0")}/${p.anio} · ${p.estado === "ABIERTO" ? "Abierto" : "Cerrado"}`;
}
export function montoCompra(monto: string) {
  return `Q ${Number(monto).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fechaCompra(fecha: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  }).format(fecha);
}
