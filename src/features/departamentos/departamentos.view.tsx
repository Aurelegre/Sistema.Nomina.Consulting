"use client";

import { useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { DepartamentosTable } from "./Components/departamentos-table";
import { EditDepartamentoModal } from "./Components/Modals/editDepartamento.modal";
import { filtrarDepartamentos } from "./Helpers/departamentos.helper";
import type { Departamento } from "./Models/departamentos.model";
import type { DepartamentosViewProps } from "./Models/departamentosView.model";

export function DepartamentosView({ identidad }: DepartamentosViewProps) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Departamento | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const departamentos = api.departamentos.listar.useQuery();
  const puedeEditar = identidad.permisos.includes("DEPARTMENTS.MANAGE");
  const pendientes =
    departamentos.data?.filter((departamento) => !departamento.cuentaContable)
      .length ?? 0;

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Organización</p>
        <h2 className="text-3xl font-semibold tracking-tight">Departamentos</h2>
        <p className="text-muted-foreground mt-2">
          Consulta los departamentos de Consulting, S.A. y sus cuentas
          contables.
        </p>
      </div>
      {mensaje && (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      )}
      {pendientes > 0 && (
        <Alert>
          <AlertDescription>
            {pendientes} departamentos tienen pendiente su cuenta contable.
            {puedeEditar
              ? " Completa la configuración desde Editar."
              : " Solicita su configuración a un usuario autorizado."}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <Input
            aria-label="Buscar departamentos"
            placeholder="Buscar nombre, código o cuenta contable"
            className="max-w-md"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          {departamentos.isPending ? (
            <p role="status">Cargando departamentos…</p>
          ) : departamentos.isError ? (
            <ErrorAcceso mensaje={departamentos.error.message} />
          ) : (
            <DepartamentosTable
              departamentos={filtrarDepartamentos(departamentos.data, busqueda)}
              puedeEditar={puedeEditar}
              actualizando={departamentos.isFetching}
              onEditar={(departamento) => {
                setMensaje(null);
                setSeleccionado(departamento);
              }}
            />
          )}
        </CardContent>
      </Card>
      {seleccionado && puedeEditar && (
        <EditDepartamentoModal
          key={`${seleccionado.id}-${seleccionado.version}`}
          departamento={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onGuardado={() => {
            setSeleccionado(null);
            setMensaje("Departamento guardado correctamente");
          }}
        />
      )}
    </main>
  );
}
