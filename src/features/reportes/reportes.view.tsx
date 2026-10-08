"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
export function ReportesView({ puedePoliza }: { puedePoliza: boolean }) {
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-3xl font-semibold">Reportes de nómina</h2>
      <p className="text-muted-foreground">
        Consulta la información histórica de las nóminas completadas.
      </p>
      {puedePoliza ? (
        <Card>
          <CardHeader>
            <CardTitle>Póliza contable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Resumen por departamento y cuenta contable, con vista previa y
              exportación a CSV o PDF.
            </p>
            <Link
              className="font-medium underline underline-offset-4"
              href="/reportes/poliza"
            >
              Abrir póliza contable
            </Link>
          </CardContent>
        </Card>
      ) : (
        <p>
          No tienes permiso para consultar la póliza contable. Solicita el
          acceso al administrador.
        </p>
      )}
    </main>
  );
}
