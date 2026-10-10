import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import {
  REPORTES_TRIBUTARIOS,
  tiposReporte,
} from "~/shared/reportes-tributarios";
import { TributarioView } from "~/features/reportes/tributario.view";
export default async function ReportePage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo: ruta } = await params;
  const tipo = tiposReporte.find((t) => REPORTES_TRIBUTARIOS[t].ruta === ruta);
  if (!tipo) notFound();
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (
    !sesion.usuario.permisos.includes(
      `${REPORTES_TRIBUTARIOS[tipo].permiso}.VIEW`,
    )
  )
    redirect("/sin-acceso");
  return <TributarioView key={tipo} tipo={tipo} />;
}
