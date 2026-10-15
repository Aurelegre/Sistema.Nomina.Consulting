"use client";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { fechaEmpleado, salarioEmpleado } from "../../Helpers/empleados.helper";
export function DetalleEmpleadoModal({
  id,
  onCerrar,
}: {
  id: number;
  onCerrar: () => void;
}) {
  const consulta = api.empleados.buscar.useQuery({ id });
  const empleado = consulta.data;
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalle del empleado</DialogTitle>
          <DialogDescription>
            Información personal y laboral vigente.
          </DialogDescription>
        </DialogHeader>
        {consulta.isPending && <p role="status">Cargando empleado…</p>}
        <ErrorAcceso mensaje={consulta.error?.message} />
        {consulta.isError && (
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Reintentar
          </Button>
        )}
        {empleado && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Código", empleado.codigo],
              ["Nombre completo", empleado.nombre],
              ["Departamento", empleado.departamento.nombre],
              ["Estado", empleado.estado === "ACTIVO" ? "Activo" : "Inactivo"],
              ["Fecha de nacimiento", fechaEmpleado(empleado.fechaNacimiento)],
              ["Fecha de ingreso", fechaEmpleado(empleado.fechaIngreso)],
              ["Fecha de salida", fechaEmpleado(empleado.fechaSalida)],
              ["Salario base mensual", salarioEmpleado(empleado.salarioBase)],
              [
                "Jefatura",
                empleado.departamentoQueDirige?.nombre ??
                  "Sin jefatura asignada",
              ],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="min-w-0">
                <dt className="text-muted-foreground text-sm">{etiqueta}</dt>
                <dd className="font-medium break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
