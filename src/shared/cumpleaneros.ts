export const mesesCumpleaneros = Array.from({ length: 12 }, (_, i) => ({
  valor: i + 1,
  nombre: new Intl.DateTimeFormat("es-GT", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, i, 1))),
}));
export const estadosCumpleaneros = {
  ACTIVO: "Activos",
  INACTIVO: "Inactivos",
  TODOS: "Todos",
} as const;
export const fechaCumpleanos = (dia: number, mes: number) =>
  String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0");
