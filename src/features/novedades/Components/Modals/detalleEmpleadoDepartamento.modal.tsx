"use client";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { fechaEmpleado } from "~/features/empleados/Helpers/empleados.helper";

export function DetalleEmpleadoDepartamentoModal({
  empleadoId,
  onCerrar,
}: {
  empleadoId: number;
  onCerrar: () => void;
}) {
  const consulta = api.novedades.detalle.useQuery({ empleadoId });
  const empleado = consulta.data;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del empleado</DialogTitle>
          <DialogDescription>
            Información personal y laboral del departamento.
          </DialogDescription>
        </DialogHeader>
        {consulta.isPending && <p role="status">Cargando empleado…</p>}
        <ErrorAcceso mensaje={consulta.error?.message} />
        {consulta.isError && (
          <Button onClick={() => void consulta.refetch()}>Reintentar</Button>
        )}
        {empleado && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Código", empleado.codigo],
              ["Nombre", empleado.nombre],
              ["Departamento", empleado.departamento],
              ["Estado", empleado.estado],
              ["Fecha de nacimiento", fechaEmpleado(empleado.fechaNacimiento)],
              ["Fecha de ingreso", fechaEmpleado(empleado.fechaIngreso)],
              ["Fecha de salida", fechaEmpleado(empleado.fechaSalida)],
              ["Salario base mensual", `Q ${empleado.salarioBase}`],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt className="text-muted-foreground text-sm">{etiqueta}</dt>
                <dd className="font-medium break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <Button variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
