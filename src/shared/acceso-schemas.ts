import { z } from "zod";

export const nombreSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(150);

export const idSchema = z.number().int().positive();

export const registroVersionSchema = z
  .object({ id: idSchema, version: idSchema })
  .strict();

export const paginaSchema = z.object({
  busqueda: z.string().trim().max(100).default(""),
  pagina: z.number().int().min(1).default(1),
  tamano: z.number().int().min(1).max(100).default(15),
});

export const estadoSchema = registroVersionSchema
  .extend({ estado: z.enum(["ACTIVO", "INACTIVO"]) })
  .strict();
