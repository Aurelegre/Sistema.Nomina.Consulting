import type { Usuario } from "./Usuario.model";
export type Confirmacion = { tipo: "estado" | "password"; usuario: Usuario };
