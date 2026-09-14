import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { PermisosView } from "~/features/permisos/permisos.view";
export default async function PermisosPage() {
  return <PermisosView identidad={await permisoPagina("PERMISSIONS.VIEW")} />;
}
