import type { Identidad } from "~/shared/Models/acceso.model";
import type { Editor } from "./Editor.model";
import type { Usuario } from "./Usuario.model";
export type UsuariosTableProps = {
  filas: Usuario[] | undefined;
  cargando: boolean;
  pendiente: boolean;
  identidad: Identidad;
  puede: (permiso: string) => boolean;
  abrirEditor: (editor: Editor) => void;
  asignarEmpleado: (usuario: Usuario) => void;
  confirmar: (tipo: "estado" | "password", usuario: Usuario) => void;
};
