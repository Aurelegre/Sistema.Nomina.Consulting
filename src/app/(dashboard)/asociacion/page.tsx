import { redirect } from "next/navigation";
import { permisoPagina } from "~/server/permisos/Helpers/pagina-permiso";
export default async function AsociacionPage() {
  await permisoPagina("ASSOCIATION.PURCHASES.VIEW");
  redirect("/asociacion/compras");
}
