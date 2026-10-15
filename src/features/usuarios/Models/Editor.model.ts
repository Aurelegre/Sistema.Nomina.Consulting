import type { Usuario } from "./Usuario.model";
export type Editor =
  { tipo: "crear" } | { tipo: "editar" | "rol"; usuario: Usuario };
