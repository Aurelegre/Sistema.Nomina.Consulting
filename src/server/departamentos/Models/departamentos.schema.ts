import { z } from "zod";
import { registroVersionSchema } from "~/shared/acceso-schemas";

const camposDepartamento = {
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
};

export const editarDepartamentoSchema = registroVersionSchema
  .extend(camposDepartamento)
  .strict();

export const crearDepartamentoSchema = z
  .object({
    ...camposDepartamento,
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "El código es obligatorio")
      .max(50, "El código admite hasta 50 caracteres")
      .regex(
        /^[A-Z][A-Z0-9_]*$/,
        "Usa letras sin tildes, números o guion bajo; inicia con una letra",
      ),
  })
  .strict();

export const desactivarDepartamentoSchema = registroVersionSchema.strict();

export const reactivarDepartamentoSchema = registroVersionSchema.strict();
