import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Rol } from "./Rol.model";
export type EditorRolModalProps = {
  editor: Rol | "nuevo" | null;
  setEditor: Dispatch<SetStateAction<Rol | "nuevo" | null>>;
  accion: ReturnType<typeof useAccionAcceso>;
  actualizar: () => Promise<void>;
};
