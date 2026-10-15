import { EmpleadosView } from "~/features/empleados/empleados.view";
import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
export default async function EmpleadosPage() {
  return <EmpleadosView identidad={await permisoPagina("EMPLOYEES.VIEW")} />;
}
