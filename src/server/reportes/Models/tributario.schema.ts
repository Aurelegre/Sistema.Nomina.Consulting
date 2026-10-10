import { z } from "zod";
import { tiposReporte } from "~/shared/reportes-tributarios";
export const tipoTributarioSchema = z
  .object({ tipo: z.enum(tiposReporte) })
  .strict();
export const periodoTributarioSchema = tipoTributarioSchema.extend({
  periodoId: z.number().int().positive(),
});
export const generarTributarioSchema = periodoTributarioSchema.extend({
  huella: z.string().regex(/^[a-f0-9]{64}$/),
});
export const exportarTributarioSchema = periodoTributarioSchema.extend({
  formato: z.enum(["csv", "pdf"]),
});
const monto = z.string().regex(/^-?\d+\.\d{2}$/);
const fila = z.object({
  empleadoId: z.number().int(),
  codigo: z.string(),
  nombre: z.string(),
  diasLaborados: z.number().int(),
  base: monto,
  rentaAnual: monto.nullable(),
  importe: monto,
});
export const datosTributarioSchema = z.object({
  version: z.literal(1),
  tipo: z.enum(tiposReporte),
  nominaId: z.number().int(),
  periodoId: z.number().int(),
  mes: z.number().int(),
  anio: z.number().int(),
  grupos: z.array(
    z.object({
      departamentoId: z.number().int().nullable(),
      departamento: z.string(),
      filas: z.array(fila),
      base: monto,
      importe: monto,
    }),
  ),
  empleados: z.number().int().nonnegative(),
  base: monto,
  importe: monto,
});
export type DatosTributario = z.infer<typeof datosTributarioSchema>;
export type DocumentoTributario = {
  datos: DatosTributario;
  reporteId: number | null;
  generadoPor: string | null;
  fechaGeneracion: Date | null;
};
