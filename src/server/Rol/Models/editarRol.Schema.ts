import z from "zod";
import { nombreSchema, registroVersionSchema } from "~/shared/acceso-schemas";

export const editarRolSchema = registroVersionSchema
  .extend({
    nombre: nombreSchema.max(100),
    descripcion: z.string().trim().max(255).default(""),
  })
  .strict();
