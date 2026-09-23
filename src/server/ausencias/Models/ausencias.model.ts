import type { z } from "zod";
import type {
  crearAusenciaSchema,
  empleadosRevisionSchema,
  listarAusenciasSchema,
  obtenerAusenciaSchema,
  resolverAusenciaSchema,
} from "./ausencias.schema";
export type CrearAusenciaInput = z.input<typeof crearAusenciaSchema>;
export type ListarAusenciasInput = z.input<typeof listarAusenciasSchema>;
export type ObtenerAusenciaInput = z.input<typeof obtenerAusenciaSchema>;
export type ResolverAusenciaInput = z.input<typeof resolverAusenciaSchema>;
export type EmpleadosRevisionInput = z.input<typeof empleadosRevisionSchema>;
