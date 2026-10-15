"use client";
import { api } from "~/trpc/react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  cuentaSalario,
  fechaAusencia,
  fechaRegistro,
} from "../../Helpers/ausencias.helper";
import { EstadoAusenciaBadge } from "../estado-ausencia-badge";
import type { AmbitoAusencias } from "../../Models/ausencias.model";
export function DetalleAusenciaModal({
  id,
  ambito,
  onCerrar,
}: {
  id: number;
  ambito: AmbitoAusencias;
  onCerrar: () => void;
}) {
  const consulta = api.ausencias.obtener.useQuery({ id, ambito });
  const ausencia = consulta.data;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalle de solicitud #{id}</DialogTitle>
          <DialogDescription>
            Fechas, departamento y resolución de la solicitud.
          </DialogDescription>
        </DialogHeader>
        {consulta.isPending && <p role="status">Cargando solicitud…</p>}
        <ErrorAcceso mensaje={consulta.error?.message} />
        {consulta.isError && (
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Reintentar
          </Button>
        )}
        {ausencia && (
          <>
            <EstadoAusenciaBadge estado={ausencia.estado} />
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                [
                  "Empleado",
                  `${ausencia.empleado.codigo} · ${ausencia.empleado.nombre}`,
                ],
                ["Departamento de la solicitud", ausencia.departamento.nombre],
                ["Fecha de inicio", fechaAusencia(ausencia.fechaInicio)],
                ["Fecha de fin", fechaAusencia(ausencia.fechaFin)],
                ["Ingresada", fechaRegistro(ausencia.fechaCreacion)],
                ["A cuenta de salario", cuentaSalario(ausencia)],
                [
                  "Resuelta por",
                  ausencia.usuarioResolucion?.nombre ?? "Sin resolver",
                ],
                [
                  "Fecha de resolución",
                  ausencia.fechaResolucion
                    ? fechaRegistro(ausencia.fechaResolucion)
                    : "Sin resolver",
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="font-medium wrap-break-word">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-muted-foreground text-sm">Motivo</p>
              <p className="wrap-break-word whitespace-pre-wrap">
                {ausencia.motivo}
              </p>
            </div>
            {ausencia.comentarioResolucion && (
              <div>
                <p className="text-muted-foreground text-sm">
                  Comentario de resolución
                </p>
                <p className="wrap-break-word whitespace-pre-wrap">
                  {ausencia.comentarioResolucion}
                </p>
              </div>
            )}
          </>
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
