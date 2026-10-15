import { z } from "zod";
export const catalogoConfiguraciones = {
  sesionMinutos: { min: 5, max: 10080, decimales: 0 },
  loginIntentos: { min: 1, max: 100, decimales: 0 },
  loginMinutos: { min: 1, max: 1440, decimales: 0 },
  igssLaboral: { min: 0, max: 100, decimales: 2 },
  igssPatronal: { min: 0, max: 100, decimales: 2 },
  solidaridad: { min: 0, max: 100, decimales: 2 },
  anticipo: { min: 0, max: 100, decimales: 2 },
  bonificacion: { min: 0, max: 1000000, decimales: 2 },
  horaBase: { min: 1, max: 744, decimales: 0 },
  factorExtra: { min: 1, max: 10, decimales: 2 },
  factorDoble: { min: 1, max: 10, decimales: 2 },
  pieza: { min: 0, max: 10000, decimales: 2 },
  comisionLimite1: { min: 0, max: 999999999, decimales: 2 },
  comisionLimite2: { min: 0, max: 999999999, decimales: 2 },
  comisionLimite3: { min: 0, max: 999999999, decimales: 2 },
  comisionTasa1: { min: 0, max: 100, decimales: 2 },
  comisionTasa2: { min: 0, max: 100, decimales: 2 },
  comisionTasa3: { min: 0, max: 100, decimales: 2 },
  isrLimite: { min: 1, max: 999999999, decimales: 2 },
  isrTasa1: { min: 0, max: 100, decimales: 2 },
  isrTasa2: { min: 0, max: 100, decimales: 2 },
} as const;
export type ClaveConfiguracion = keyof typeof catalogoConfiguraciones;
export const editarConfiguracionSchema = z.object({
  id: z.number().int().positive(),
  version: z.number().int().positive(),
  valor: z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      "Ingresa un número positivo con hasta dos decimales",
    )
    .max(16),
});
export function valorValido(
  valor: string,
  regla: { min: number; max: number; decimales: number },
) {
  return (
    /^\d+(\.\d{1,2})?$/.test(valor) &&
    Number(valor) >= regla.min &&
    Number(valor) <= regla.max &&
    (regla.decimales !== 0 || Number.isInteger(Number(valor)))
  );
}
