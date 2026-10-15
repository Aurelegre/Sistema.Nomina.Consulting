import { z } from "zod";
const id = z.number().int().positive();
const datos = {
  monto: z
    .string()
    .regex(
      /^\d{1,10}(\.\d{1,2})?$/,
      "Ingresa un monto con máximo dos decimales.",
    )
    .refine((s) => Number(s) > 0, "El monto debe ser mayor que cero."),
  detalle: z.string().trim().min(1, "El detalle es obligatorio.").max(500),
};
export const crearCompraSchema = z
  .object({ ...datos, empleadoId: id, periodoId: id })
  .strict();
export const editarCompraSchema = z
  .object({ ...datos, id, version: id })
  .strict();
export const eliminarCompraSchema = z.object({ id, version: id }).strict();
export const listarComprasSchema = z
  .object({
    periodoId: id.optional(),
    empleadoId: id.optional(),
    busqueda: z.string().trim().max(150).default(""),
    pagina: id.default(1),
  })
  .strict();
export const empleadosCompraSchema = z
  .object({
    busqueda: z.string().trim().max(150).default(""),
    pagina: id.default(1),
  })
  .strict();
