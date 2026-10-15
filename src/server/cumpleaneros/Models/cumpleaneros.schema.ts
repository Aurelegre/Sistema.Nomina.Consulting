import { z } from "zod";
export const filtrosCumpleanerosSchema = z
  .object({
    mes: z.number().int().min(1).max(12),
    estado: z.enum(["ACTIVO", "INACTIVO", "TODOS"]).default("ACTIVO"),
    departamentoId: z.number().int().positive().optional(),
  })
  .strict();
export const exportarCumpleanerosSchema = filtrosCumpleanerosSchema.extend({
  formato: z.enum(["csv", "pdf"]),
});
export type FiltrosCumpleaneros = z.infer<typeof filtrosCumpleanerosSchema>;
export type FilaCumpleaneros = {
  codigo: string;
  nombre: string;
  departamento: string;
  dia: number;
};
