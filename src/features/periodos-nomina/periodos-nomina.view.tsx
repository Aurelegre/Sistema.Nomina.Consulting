"use client";
import { useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";
import { CrearPeriodoForm } from "./Components/crear-periodo-form";
import { CerrarPeriodoModal } from "./Components/Modals/cerrarPeriodo.modal";
import { PeriodosTable } from "./Components/periodos-table";
import type { PeriodoSeleccionado } from "./Models/periodos-nomina.model";
export function PeriodosNominaView() {
  const [periodoSeleccionado, setPeriodoSeleccionado] =
    useState<PeriodoSeleccionado | null>(null);
  const identidad = api.auth.me.useQuery();
  const periodos = api.periodosNomina.listar.useQuery();
  return (
    <main className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Nómina
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Períodos de nómina
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Administra los meses disponibles para registrar novedades y procesar
          la nómina.
        </p>
      </div>
      {identidad.data?.permisos.includes("PAYROLL_PERIODS.CREATE") && (
        <CrearPeriodoForm />
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Períodos registrados</h2>
          </CardTitle>
          <CardDescription>
            Un período cerrado queda disponible únicamente para consulta y
            reportes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodos.isPending ? (
            <p>Cargando períodos...</p>
          ) : periodos.isError ? (
            <ErrorAcceso mensaje={periodos.error.message} />
          ) : periodos.data.length === 0 ? (
            <p>Todavía no hay períodos de nómina registrados.</p>
          ) : (
            <PeriodosTable
              periodos={periodos.data}
              puedeCerrar={
                identidad.data?.permisos.includes("PAYROLL_PERIODS.CLOSE") ??
                false
              }
              onCerrar={setPeriodoSeleccionado}
            />
          )}
        </CardContent>
      </Card>
      <CerrarPeriodoModal
        key={periodoSeleccionado?.id ?? "cerrado"}
        periodo={periodoSeleccionado}
        onCancelar={() => setPeriodoSeleccionado(null)}
      />
    </main>
  );
}
