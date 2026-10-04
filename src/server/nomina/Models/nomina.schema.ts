import { z } from "zod";
export const idNominaSchema = z
  .object({ id: z.number().int().positive() })
  .strict();
export const generarNominaSchema = z
  .object({ periodoId: z.number().int().positive() })
  .strict();
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const filtroNominaSchema = z
  .object({
    desde: mes.optional(),
    hasta: mes.optional(),
    pagina: z.number().int().min(1).default(1),
  })
  .strict()
  .refine(
    (v) => !v.desde || !v.hasta || v.desde <= v.hasta,
    "El rango de períodos no es válido.",
  );
export const detalleNominaSchema = z
  .object({
    id: z.number().int().positive(),
    pagina: z.number().int().min(1).default(1),
  })
  .strict();
