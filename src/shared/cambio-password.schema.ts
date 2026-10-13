import { z } from "zod";
export const cambioPasswordSchema = z
  .object({
    passwordActual: z
      .string()
      .min(1, "Ingresa tu contraseña actual")
      .max(128, "Máximo 128 caracteres"),
    nuevaPassword: z
      .string()
      .min(12, "Usa al menos 12 caracteres")
      .max(128, "Máximo 128 caracteres"),
    confirmarPassword: z
      .string()
      .min(1, "Confirma la nueva contraseña")
      .max(128, "Máximo 128 caracteres"),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.nuevaPassword !== v.confirmarPassword)
      ctx.addIssue({
        code: "custom",
        path: ["confirmarPassword"],
        message: "Las contraseñas no coinciden",
      });
    if (v.passwordActual === v.nuevaPassword)
      ctx.addIssue({
        code: "custom",
        path: ["nuevaPassword"],
        message: "La nueva contraseña debe ser diferente de la actual",
      });
  });
