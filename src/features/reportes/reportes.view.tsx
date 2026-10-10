"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  REPORTES_TRIBUTARIOS,
  tiposReporte,
} from "~/shared/reportes-tributarios";
export function ReportesView({ permisos }: { permisos: string[] }) {
  const opciones = [
    {
      titulo: "Cumpleañeros",
      ruta: "cumpleaneros",
      permiso: "BIRTHDAYS_REPORT.VIEW",
      descripcion: "Consulta por mes, estado y departamento.",
    },
    {
      titulo: "Póliza contable",
      ruta: "poliza",
      permiso: "ACCOUNTING_POLICY.VIEW",
      descripcion: "Resumen por departamento y cuenta contable.",
    },
    ...tiposReporte.map((t) => ({
      titulo: REPORTES_TRIBUTARIOS[t].titulo,
      ruta: REPORTES_TRIBUTARIOS[t].ruta,
      permiso: `${REPORTES_TRIBUTARIOS[t].permiso}.VIEW`,
      descripcion:
        t === "IGSS_PATRONAL"
          ? "Aportes patronales por empleado y departamento."
          : t === "IGSS_LABORAL"
            ? "Cuotas laborales por empleado y departamento."
            : "Retenciones mensuales de ISR por empleado y departamento.",
    })),
  ].filter((o) => permisos.includes(o.permiso));
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-3xl font-semibold">Reportes de nómina</h2>
      <p className="text-muted-foreground">
        Consulta los reportes de nómina y empleados.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {opciones.map((o) => (
          <Card key={o.ruta}>
            <CardHeader>
              <CardTitle>{o.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{o.descripcion} Exportación CSV/PDF.</p>
              <Link
                className="font-medium underline underline-offset-4"
                href={`/reportes/${o.ruta}`}
              >
                Abrir{" "}
                {o.titulo === "Póliza contable" ? "póliza contable" : o.titulo}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {opciones.length === 0 && (
        <p>
          No tienes permisos para los reportes disponibles. Solicita acceso al
          administrador.
        </p>
      )}
    </main>
  );
}
