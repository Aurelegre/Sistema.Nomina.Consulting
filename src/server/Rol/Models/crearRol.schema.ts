import z from "zod";
import { nombreSchema } from "~/shared/acceso-schemas";

export const crearRolSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z][A-Z0-9_]{2,49}$/,
        "Usa de 3 a 50 letras mayúsculas, números o guiones bajos",
      ),
    nombre: nombreSchema.max(100),
    descripcion: z.string().trim().max(255).default(""),
  })
  .strict();
