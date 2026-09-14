import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { RolesManager } from "~/app/_components/acceso/roles-manager";
export default async function RolesPage() {
  return <RolesManager identidad={await permisoPagina("ROLES.VIEW")} />;
}
