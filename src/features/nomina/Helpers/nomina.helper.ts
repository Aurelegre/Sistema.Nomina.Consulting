export const dinero = (valor: string) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(
    Number(valor),
  );
export const periodoTexto = (p: { mes: number; anio: number }) =>
  new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(p.anio, p.mes - 1, 1)));
export const fechaTexto = (valor: Date | null) =>
  valor
    ? new Intl.DateTimeFormat("es-GT", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Guatemala",
      }).format(valor)
    : "—";
