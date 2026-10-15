import { DepartamentosView } from "~/features/departamentos/departamentos.view";
import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";

export default async function DepartamentosPage() {
  return (
    <DepartamentosView identidad={await permisoPagina("DEPARTMENTS.VIEW")} />
  );
}
