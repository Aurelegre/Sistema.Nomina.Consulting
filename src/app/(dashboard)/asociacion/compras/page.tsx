import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
import { ComprasSolidariasView } from "~/features/compras-solidarias/compras-solidarias.view";
export default async function ComprasPage() {
  await permisoPagina("ASSOCIATION.PURCHASES.VIEW");
  return <ComprasSolidariasView />;
}
