import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { InicioView } from "~/features/inicio/inicio.view";
export default async function DashboardPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  return (
    <InicioView
      permisos={sesion.usuario.permisos}
      empleadoId={sesion.usuario.empleadoId}
      esJefeDepartamento={sesion.usuario.esJefeDepartamento}
    />
  );
}
