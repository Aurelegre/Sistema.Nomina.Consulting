import type { DetalleNomina } from "@prisma/client";
import type { decimales } from "../nomina.service";
type Fila = ReturnType<typeof decimales<DetalleNomina>>;
const columnas: [keyof Fila, string][] = [
  ["codigo", "Código"],
  ["nombre", "Empleado"],
  ["departamento", "Departamento"],
  ["cuentaContable", "Cuenta contable"],
  ["salarioBase", "Salario base"],
  ["diasLaborados", "Días laborados"],
  ["diasAusencia", "Días ausencia"],
  ["salarioDevengado", "Salario devengado"],
  ["descuentoAusencias", "Reducción por ausencias (incluida en devengado)"],
  ["horasExtras", "Horas extras"],
  ["montoExtras", "Pago extras"],
  ["horasDobles", "Horas dobles"],
  ["montoDobles", "Pago dobles"],
  ["piezas", "Piezas"],
  ["produccion", "Producción"],
  ["ventas", "Ventas"],
  ["tasaComision", "Tasa comisión"],
  ["comision", "Comisiones"],
  ["bonificacion", "Bonificación incentivo"],
  ["totalIngresos", "Ingresos"],
  ["baseIgss", "Base IGSS"],
  ["igssLaboral", "IGSS laboral"],
  ["igssPatronal", "IGSS patronal"],
  ["rentaAnual", "Renta imponible anual de referencia"],
  ["isr", "ISR"],
  ["solidaridad", "Ahorro solidarista"],
  ["compras", "Compras solidarias"],
  ["totalEgresos", "Deducciones"],
  ["liquido", "Líquido"],
  ["anticipo", "Anticipo"],
  ["pagoFinal", "Pago final"],
];
export function celdaCsv(valor: unknown, texto = false) {
  let contenido =
    typeof valor === "string"
      ? valor
      : typeof valor === "number"
        ? String(valor)
        : "";
  if (texto && /^[\s]*[=+\-@\t\r\n]/.test(contenido))
    contenido = "'" + contenido;
  return '"' + contenido.replaceAll('"', '""') + '"';
}
export function csvNomina(filas: Fila[], periodo: string) {
  return (
    "\uFEFF" +
    [
      ["Período", ...columnas.map(([, titulo]) => titulo)]
        .map((v) => celdaCsv(v, true))
        .join(","),
      ...filas.map((f) =>
        [
          celdaCsv(periodo, true),
          ...columnas.map(([k]) =>
            celdaCsv(
              f[k],
              ["codigo", "nombre", "departamento", "cuentaContable"].includes(
                k,
              ),
            ),
          ),
        ].join(","),
      ),
    ].join("\r\n") +
    "\r\n"
  );
}
