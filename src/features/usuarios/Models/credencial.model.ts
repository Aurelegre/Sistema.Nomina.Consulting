import type { Salidas } from "~/shared/Models/acceso.model";
export type Credencial = Omit<
  Salidas["usuarios"]["restablecerPassword"],
  "propiaCuenta"
> & { propiaCuenta?: boolean };
