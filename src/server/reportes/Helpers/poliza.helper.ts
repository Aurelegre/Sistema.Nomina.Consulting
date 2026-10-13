import { Prisma, type DetalleNomina } from "@prisma/client";
import { createHash } from "node:crypto";
import type { DatosPoliza, ImportesPoliza } from "../Models/poliza.schema";

export const conceptosPoliza = [
  ["salarioDevengado", "Salario devengado", "Gasto / costo departamental"],
  ["montoExtras", "Horas extras", "Gasto / costo departamental"],
  ["montoDobles", "Horas dobles", "Gasto / costo departamental"],
  ["bonificacion", "Bonificación incentivo", "Gasto / costo departamental"],
  ["produccion", "Bonificación por producción", "Gasto / costo departamental"],
  ["comision", "Comisiones de Mercadeo", "Gasto / costo departamental"],
  ["totalIngresos", "Subtotal salario y adicionales", "Subtotal"],
  ["igssPatronal", "IGSS patronal", "Costo patronal / obligación por pagar"],
  ["igssLaboral", "IGSS laboral", "Retención por pagar"],
  ["isr", "ISR", "Retención por pagar"],
  ["solidaridad", "Cuota solidarista", "Obligación con la asociación"],
  ["compras", "Compras solidarias", "Descuento registrado en nómina"],
  ["totalEgresos", "Subtotal descuentos", "Subtotal"],
  ["anticipo", "Anticipo Quincenal", "Compensación del anticipo"],
  ["pagoFinal", "Pago final", "Remuneración pendiente según nómina"],
] as const satisfies ReadonlyArray<
  readonly [keyof ImportesPoliza, string, string]
>;
export const importesCero = (): ImportesPoliza => ({
  salarioDevengado: "0.00",
  montoExtras: "0.00",
  montoDobles: "0.00",
  bonificacion: "0.00",
  produccion: "0.00",
  comision: "0.00",
  totalIngresos: "0.00",
  igssPatronal: "0.00",
  igssLaboral: "0.00",
  isr: "0.00",
  solidaridad: "0.00",
  compras: "0.00",
  totalEgresos: "0.00",
  anticipo: "0.00",
  pagoFinal: "0.00",
});
function sumar(
  destino: ImportesPoliza,
  origen: Record<keyof ImportesPoliza, Prisma.Decimal | string>,
) {
  for (const [campo] of conceptosPoliza)
    destino[campo] = new Prisma.Decimal(destino[campo])
      .plus(origen[campo])
      .toFixed(2);
}
export function agruparPoliza(
  periodo: { id: number; mes: number; anio: number },
  nominaId: number,
  detalles: DetalleNomina[],
  departamentos: {
    id: number;
    nombre: string;
    cuentaContable: string | null;
  }[],
): DatosPoliza {
  const mapa = new Map<string, DatosPoliza["grupos"][number]>();
  const clave = (id: number | string, cuenta: string | null) =>
    JSON.stringify([id, cuenta]);
  for (const d of detalles) {
    const entrada = d.entrada as { departamentoId?: unknown };
    const departamentoId =
      typeof entrada?.departamentoId === "number"
        ? entrada.departamentoId
        : null;
    const key = clave(departamentoId ?? d.departamento, d.cuentaContable);
    let grupo = mapa.get(key);
    if (!grupo) {
      grupo = {
        departamentoId,
        departamento: d.departamento,
        cuenta: d.cuentaContable,
        empleados: 0,
        sinMovimientos: false,
        importes: importesCero(),
      };
      mapa.set(key, grupo);
    }
    grupo.empleados++;
    sumar(grupo.importes, d);
  }
  // Current accounts not present in the historical snapshot carry zero only.
  // A missing historical account keeps its amounts; never move them to a new one.
  for (const d of departamentos) {
    if (!d.cuentaContable) continue;
    const key = clave(d.id, d.cuentaContable);
    if (!mapa.has(key))
      mapa.set(key, {
        departamentoId: d.id,
        departamento: d.nombre,
        cuenta: d.cuentaContable,
        empleados: 0,
        sinMovimientos: true,
        importes: importesCero(),
      });
  }
  const grupos = [...mapa.values()].sort(
    (a, b) =>
      (a.cuenta ?? "").localeCompare(b.cuenta ?? "") ||
      a.departamento.localeCompare(b.departamento) ||
      (a.departamentoId ?? 0) - (b.departamentoId ?? 0),
  );
  const cuentas = new Map<string | null, ImportesPoliza>();
  const totales = importesCero();
  for (const g of grupos) {
    sumar(totales, g.importes);
    const valores = cuentas.get(g.cuenta) ?? importesCero();
    sumar(valores, g.importes);
    cuentas.set(g.cuenta, valores);
  }
  return {
    version: 1,
    nominaId,
    periodoId: periodo.id,
    mes: periodo.mes,
    anio: periodo.anio,
    grupos,
    cuentas: [...cuentas].map(([cuenta, importes]) => ({ cuenta, importes })),
    totales,
  };
}
export const huellaPoliza = (datos: DatosPoliza) =>
  createHash("sha256").update(JSON.stringify(datos)).digest("hex");
