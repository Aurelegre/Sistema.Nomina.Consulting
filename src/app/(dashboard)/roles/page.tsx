import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { RolesView } from "~/features/roles/roles.view";
export default async function RolesPage() {
  return <RolesView identidad={await permisoPagina("ROLES.VIEW")} />;
}
