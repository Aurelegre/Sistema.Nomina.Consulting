import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { NominaView } from "~/features/nomina/nomina.view";
export default async function NominaPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (
    !sesion.usuario.permisos.some((p) =>
      ["PAYROLL.VIEW", "PAYROLL.PROCESS"].includes(p),
    )
  )
    redirect("/sin-acceso");
  return <NominaView />;
}
