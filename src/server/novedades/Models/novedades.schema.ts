import { z } from "zod";

export const tipoNovedadSchema = z.enum([
  "HORAS_EXTRAS",
  "HORAS_DOBLES",
  "PIEZAS",
  "VENTAS",
]);
export const listarNovedadesSchema = z
  .object({
    periodoId: z.number().int().positive().optional(),
    busqueda: z.string().trim().max(150).default(""),
    pagina: z.number().int().positive().default(1),
    tamano: z.number().int().min(1).max(50).default(20),
  })
  .strict();
export const detalleNovedadesSchema = z
  .object({ empleadoId: z.number().int().positive() })
  .strict();
export const registrarNovedadSchema = z
  .object({
    solicitudId: z.string().uuid(),
    empleadoId: z.number().int().positive(),
    periodoId: z.number().int().positive(),
    tipo: tipoNovedadSchema,
    cantidad: z
      .string()
      .regex(
        /^\d{1,10}(\.\d{1,2})?$/,
        "Ingresa un valor positivo con un máximo de dos decimales.",
      )
      .refine(
        (valor) => Number(valor) > 0,
        "La cantidad debe ser mayor que cero.",
      ),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.tipo === "PIEZAS" && !Number.isInteger(Number(data.cantidad)))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cantidad"],
        message: "Las piezas deben ser enteras.",
      });
  });
