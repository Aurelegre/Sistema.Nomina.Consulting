"use client";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import { SolicitudesAusencias } from "./Components/solicitudes-ausencias";
import type { AusenciasViewProps } from "./Models/ausencias.model";
import { HistoricoAusencias } from "./Components/historico-ausencias";
export function AusenciasView({ contextoInicial, ambito }: AusenciasViewProps) {
  const contexto = api.ausencias.contexto.useQuery(undefined, {
    initialData: contextoInicial,
  });
  const empleado = contexto.data.empleado;
  const jefe = empleado?.departamentoQueDirige;
  const acceso = !!empleado && (ambito === "propias" || !!jefe);
  const historico = contexto.data.puedeConsultarHistorico;
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-5">
        <div>
          <p className="text-muted-foreground text-sm">
            Solicitudes de personal
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">Ausencias</h2>
          <p className="text-muted-foreground mt-2">
            {ambito === "propias"
              ? "Consulta tu historial y solicita una ausencia."
              : `Revisa las solicitudes de ${jefe?.nombre ?? "tu departamento"}.`}
          </p>
        </div>
        <nav aria-label="Gestión de ausencias" className="flex flex-wrap gap-2">
          {empleado && (
            <Button
              variant={ambito === "propias" ? "default" : "outline"}
              nativeButton={false}
              role="link"
              render={
                <Link
                  href="/ausencias"
                  aria-current={ambito === "propias" ? "page" : undefined}
                />
              }
            >
              Mis solicitudes
            </Button>
          )}
          {jefe && (
            <Button
              variant={ambito === "departamento" ? "default" : "outline"}
              nativeButton={false}
              role="link"
              render={
                <Link
                  href="/ausencias/revision"
                  aria-current={ambito === "departamento" ? "page" : undefined}
                />
              }
            >
              Revisión del departamento
            </Button>
          )}
          {historico && (
            <Button
              variant={ambito === "todos" ? "default" : "outline"}
              nativeButton={false}
              role="link"
              render={
                <Link
                  href="/ausencias/historico"
                  aria-current={ambito === "todos" ? "page" : undefined}
                />
              }
            >
              Historial de Empleados
            </Button>
          )}
        </nav>
      </div>
      {contexto.isError ? (
        <>
          <ErrorAcceso mensaje={contexto.error.message} />
          <Button variant="outline" onClick={() => void contexto.refetch()}>
            Reintentar
          </Button>
        </>
      ) : !acceso && !historico ? (
        <ErrorAcceso mensaje="Tu cuenta ya no tiene acceso a este apartado. Solicita la revisión de tu vínculo o jefatura." />
      ) : ambito === "todos" ? (
        <HistoricoAusencias ambito="todos" contexto={contexto.data} />
      ) : (
        <SolicitudesAusencias
          key={ambito}
          ambito={ambito}
          contexto={contexto.data}
        />
      )}
    </main>
  );
}
