import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { UsuariosView } from "~/features/usuarios/usuarios.view";
export default async function UsuariosPage() {
  return <UsuariosView identidad={await permisoPagina("USERS.VIEW")} />;
}
