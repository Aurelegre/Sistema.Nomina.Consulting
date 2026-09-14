import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Rol } from "./Rol.model";
export type ConfirmarPermisosRolModalProps = {
  confirmarPermisos: boolean;
  setConfirmarPermisos: Dispatch<SetStateAction<boolean>>;
  rolPermisos: Rol | null;
  setRolPermisos: Dispatch<SetStateAction<Rol | null>>;
  agregados: string[];
  retirados: string[];
  seleccionados: string[];
  accion: ReturnType<typeof useAccionAcceso>;
  actualizar: () => Promise<void>;
};
