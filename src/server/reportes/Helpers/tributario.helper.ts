import { Prisma, type DetalleNomina } from "@prisma/client";
import { createHash } from "node:crypto";
import type { TipoReporte } from "~/shared/reportes-tributarios";
import type { DatosTributario } from "../Models/tributario.schema";
export function agruparTributario(
  tipo: TipoReporte,
  periodo: { id: number; mes: number; anio: number },
  nominaId: number,
  detalles: DetalleNomina[],
  departamentos: { id: number; nombre: string }[],
): DatosTributario {
  const mapa = new Map<string, DatosTributario["grupos"][number]>();
  const empleados = new Set<number>();
  for (const d of detalles) {
    if (empleados.has(d.empleadoId))
      throw new Error("Empleado duplicado en el detalle de nómina.");
    empleados.add(d.empleadoId);
    const entrada = d.entrada as { departamentoId?: unknown };
    const id =
      typeof entrada?.departamentoId === "number"
        ? entrada.departamentoId
        : null;
    const clave = id === null ? `nombre:${d.departamento}` : `id:${id}`;
    let grupo = mapa.get(clave);
    if (!grupo) {
      grupo = {
        departamentoId: id,
        departamento: d.departamento,
        filas: [],
        base: "0.00",
        importe: "0.00",
      };
      mapa.set(clave, grupo);
    }
    const base = (tipo === "ISR" ? d.totalIngresos : d.baseIgss).toFixed(2);
    const importe = (
      tipo === "ISR"
        ? d.isr
        : tipo === "IGSS_LABORAL"
          ? d.igssLaboral
          : d.igssPatronal
    ).toFixed(2);
    grupo.filas.push({
      empleadoId: d.empleadoId,
      codigo: d.codigo,
      nombre: d.nombre,
      diasLaborados: d.diasLaborados,
      base,
      rentaAnual: tipo === "ISR" ? d.rentaAnual.toFixed(2) : null,
      importe,
    });
    grupo.base = new Prisma.Decimal(grupo.base).plus(base).toFixed(2);
    grupo.importe = new Prisma.Decimal(grupo.importe).plus(importe).toFixed(2);
  }
  for (const departamento of departamentos) {
    const key = `id:${departamento.id}`;
    if (!mapa.has(key))
      mapa.set(key, {
        departamentoId: departamento.id,
        departamento: departamento.nombre,
        filas: [],
        base: "0.00",
        importe: "0.00",
      });
  }
  const grupos = [...mapa.values()].sort(
    (a, b) =>
      a.departamento.localeCompare(b.departamento) ||
      (a.departamentoId ?? 0) - (b.departamentoId ?? 0),
  );
  for (const grupo of grupos)
    grupo.filas.sort(
      (a, b) => a.codigo.localeCompare(b.codigo) || a.empleadoId - b.empleadoId,
    );
  const sumar = (campo: "base" | "importe") =>
    grupos.reduce((s, g) => s.plus(g[campo]), new Prisma.Decimal(0)).toFixed(2);
  return {
    version: 1,
    tipo,
    nominaId,
    periodoId: periodo.id,
    mes: periodo.mes,
    anio: periodo.anio,
    grupos,
    empleados: empleados.size,
    base: sumar("base"),
    importe: sumar("importe"),
  };
}
export const huellaTributario = (datos: DatosTributario) =>
  createHash("sha256").update(JSON.stringify(datos)).digest("hex");
