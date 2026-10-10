import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { ReportesView } from "~/features/reportes/reportes.view";
export default async function ReportesPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (
    !sesion.usuario.permisos.some((p) =>
      [
        "REPORTS.VIEW",
        "ACCOUNTING_POLICY.VIEW",
        "IGSS_LABOR_REPORT.VIEW",
        "IGSS_EMPLOYER_REPORT.VIEW",
        "ISR_REPORT.VIEW",
      ].includes(p),
    )
  )
    redirect("/sin-acceso");
  return <ReportesView permisos={sesion.usuario.permisos} />;
}
