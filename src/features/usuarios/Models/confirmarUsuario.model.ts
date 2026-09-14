import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Confirmacion } from "./confirmacion.model";
import type { Credencial } from "./credencial.model";
export type ConfirmarUsuarioModalProps = {
  confirmacion: Confirmacion | null;
  setConfirmacion: Dispatch<SetStateAction<Confirmacion | null>>;
  accion: ReturnType<typeof useAccionAcceso>;
  setCredencial: Dispatch<SetStateAction<Credencial | null>>;
  actualizar: () => Promise<void>;
};
