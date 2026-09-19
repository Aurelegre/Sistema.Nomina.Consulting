import { z } from "zod";
import {
  idSchema,
  paginaSchema,
  registroVersionSchema,
} from "~/shared/acceso-schemas";

// Fechas de calendario explícitas: no se aceptan horas ni conversiones locales.
const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha con formato AAAA-MM-DD")
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return (
      Number.isFinite(fecha.getTime()) &&
      fecha.toISOString().slice(0, 10) === valor &&
      valor >= "1900-01-01"
    );
  }, "La fecha no es válida o es anterior a 1900")
  .transform((valor) => new Date(`${valor}T00:00:00.000Z`));

export const crearAusenciaSchema = z
  .object({
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    motivo: z.string().trim().min(1, "El motivo es obligatorio").max(500),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.fechaInicio > input.fechaFin)
      ctx.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "La fecha final no puede ser anterior a la inicial",
      });
    if (
      input.fechaInicio.getUTCFullYear() !== input.fechaFin.getUTCFullYear() ||
      input.fechaInicio.getUTCMonth() !== input.fechaFin.getUTCMonth()
    )
      ctx.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "La ausencia debe pertenecer al mismo mes y año",
      });
  });
export const resolverAusenciaSchema = registroVersionSchema
  .extend({
    aCuentaSalario: z.boolean(),
    comentarioResolucion: z.string().trim().max(500).optional(),
  })
  .strict();
export const obtenerAusenciaSchema = z.object({ id: idSchema }).strict();
export const listarAusenciasSchema = paginaSchema
  .extend({
    empleadoId: idSchema.optional(),
    departamentoId: idSchema.optional(),
    estado: z
      .enum(["PENDIENTE", "APROBADA", "RECHAZADA", "APLICADA_NOMINA"])
      .optional(),
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
  })
  .strict()
  .refine(
    (input) => !input.desde || !input.hasta || input.desde <= input.hasta,
    {
      path: ["hasta"],
      message: "La fecha final del filtro no puede ser anterior a la inicial",
    },
  );
