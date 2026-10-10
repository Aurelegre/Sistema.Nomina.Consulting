import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { PolizaView } from "~/features/reportes/poliza.view";
export default async function PolizaPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.permisos.includes("ACCOUNTING_POLICY.VIEW"))
    redirect("/sin-acceso");
  return <PolizaView />;
}
