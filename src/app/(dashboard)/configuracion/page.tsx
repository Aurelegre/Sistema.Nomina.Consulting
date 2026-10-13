import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { ConfiguracionesView } from "~/features/configuraciones/configuraciones.view";
export default async function Page() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.permisos.includes("SETTINGS.VIEW"))
    redirect("/sin-acceso");
  return <ConfiguracionesView />;
}
