import { z } from "zod";

export const periodoPolizaSchema = z
  .object({ periodoId: z.number().int().positive() })
  .strict();
export const generarPolizaSchema = periodoPolizaSchema.extend({
  huella: z.string().regex(/^[a-f0-9]{64}$/),
});
export const exportarPolizaSchema = periodoPolizaSchema.extend({
  formato: z.enum(["csv", "pdf"]),
});

const monto = z.string().regex(/^-?\d+\.\d{2}$/);
export const importesPolizaSchema = z.object({
  salarioDevengado: monto,
  montoExtras: monto,
  montoDobles: monto,
  bonificacion: monto,
  produccion: monto,
  comision: monto,
  totalIngresos: monto,
  igssPatronal: monto,
  igssLaboral: monto,
  isr: monto,
  solidaridad: monto,
  compras: monto,
  totalEgresos: monto,
  anticipo: monto,
  pagoFinal: monto,
});
export const grupoPolizaSchema = z.object({
  departamentoId: z.number().int().nullable(),
  departamento: z.string(),
  cuenta: z.string().nullable(),
  empleados: z.number().int().nonnegative(),
  sinMovimientos: z.boolean(),
  importes: importesPolizaSchema,
});
export const datosPolizaSchema = z.object({
  version: z.literal(1),
  nominaId: z.number().int(),
  periodoId: z.number().int(),
  mes: z.number().int(),
  anio: z.number().int(),
  grupos: z.array(grupoPolizaSchema),
  cuentas: z.array(
    z.object({ cuenta: z.string().nullable(), importes: importesPolizaSchema }),
  ),
  totales: importesPolizaSchema,
});
export type ImportesPoliza = z.infer<typeof importesPolizaSchema>;
export type DatosPoliza = z.infer<typeof datosPolizaSchema>;
export type DocumentoPoliza = {
  datos: DatosPoliza;
  reporteId: number | null;
  generadoPor: string | null;
  fechaGeneracion: Date | null;
};
