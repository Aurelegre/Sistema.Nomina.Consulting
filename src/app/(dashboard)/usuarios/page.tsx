import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { UsuariosManager } from "~/app/_components/acceso/usuarios-manager";
export default async function UsuariosPage() {
  return <UsuariosManager identidad={await permisoPagina("USERS.VIEW")} />;
}
