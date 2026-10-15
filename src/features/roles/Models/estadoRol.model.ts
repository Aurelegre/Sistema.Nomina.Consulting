import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Rol } from "./Rol.model";
export type EstadoRolModalProps = {
  estadoRol: Rol | null;
  setEstadoRol: Dispatch<SetStateAction<Rol | null>>;
  accion: ReturnType<typeof useAccionAcceso>;
  actualizar: () => Promise<void>;
};
