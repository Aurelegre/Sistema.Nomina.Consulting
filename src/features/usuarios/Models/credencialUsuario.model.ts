import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Credencial } from "./credencial.model";
export type CredencialUsuarioModalProps = {
  credencial: Credencial | null;
  cerrarCredencial: () => void;
  copiado: boolean;
  setCopiado: Dispatch<SetStateAction<boolean>>;
  accion: ReturnType<typeof useAccionAcceso>;
};
