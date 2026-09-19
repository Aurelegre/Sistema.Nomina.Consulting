import type z from "zod";
import type {
  crearEmpleadoSchema,
  desactivarEmpleadoSchema,
  editarEmpleadoSchema,
  listarEmpleadosSchema,
  obtenerEmpleadoSchema,
  reactivarEmpleadoSchema,
} from "./empleados.schema";

export type EditarEmpleadoInput = z.infer<typeof editarEmpleadoSchema>;
export type CrearEmpleadoInput = z.infer<typeof crearEmpleadoSchema>;
export type DesactivarEmpleadoInput = z.infer<typeof desactivarEmpleadoSchema>;
export type ReactivarEmpleadoInput = z.infer<typeof reactivarEmpleadoSchema>;
export type ListarEmpleadosInput = z.infer<typeof listarEmpleadosSchema>;
export type ObtenerEmpleadoInput = z.infer<typeof obtenerEmpleadoSchema>;
