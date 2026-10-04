import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { NominaView } from "~/features/nomina/nomina.view";
export default async function MiNominaPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.empleadoId) redirect("/sin-acceso");
  return <NominaView propia />;
}
