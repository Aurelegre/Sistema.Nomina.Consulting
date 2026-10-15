import type { z } from "zod";
import type {
  crearDepartamentoSchema,
  desactivarDepartamentoSchema,
  editarDepartamentoSchema,
  reactivarDepartamentoSchema,
} from "./departamentos.schema";

export type EditarDepartamentoInput = z.infer<typeof editarDepartamentoSchema>;
export type CrearDepartamentoInput = z.infer<typeof crearDepartamentoSchema>;
export type DesactivarDepartamentoInput = z.infer<
  typeof desactivarDepartamentoSchema
>;
export type ReactivarDepartamentoInput = z.infer<
  typeof reactivarDepartamentoSchema
>;
