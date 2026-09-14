import type { Dispatch, SetStateAction } from "react";
import type { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import type { Identidad } from "~/shared/Models/acceso.model";
import type { Credencial } from "./credencial.model";
import type { Editor } from "./Editor.model";
export type EditorUsuarioModalProps = {
  editor: Editor | null;
  setEditor: Dispatch<SetStateAction<Editor | null>>;
  accion: ReturnType<typeof useAccionAcceso>;
  rolElegido: string;
  setRolElegido: Dispatch<SetStateAction<string>>;
  opcionesRoles: { value: string; label: string }[];
  errorAsignables: string | undefined;
  cargandoAsignables: boolean;
  identidad: Identidad;
  setCredencial: Dispatch<SetStateAction<Credencial | null>>;
  actualizar: () => Promise<void>;
};
