import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { PermisosManager } from "~/app/_components/acceso/permisos-manager";
export default async function PermisosPage() {
  return (
    <PermisosManager identidad={await permisoPagina("PERMISSIONS.VIEW")} />
  );
}
