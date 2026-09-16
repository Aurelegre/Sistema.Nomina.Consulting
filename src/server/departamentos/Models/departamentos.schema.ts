import { z } from "zod";
import { registroVersionSchema } from "~/shared/acceso-schemas";

export const editarDepartamentoSchema = registroVersionSchema
  .extend({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(100, "El nombre admite hasta 100 caracteres")
      .transform((nombre) => nombre.replace(/\s+/g, " ")),
    cuentaContable: z
      .string()
      .trim()
      .min(1, "La cuenta contable es obligatoria")
      .max(50, "La cuenta contable admite hasta 50 caracteres")
      .refine(
        (cuenta) => !/[\u0000-\u001f\u007f]/.test(cuenta),
        "La cuenta contable no admite caracteres de control",
      ),
  })
  .strict();
