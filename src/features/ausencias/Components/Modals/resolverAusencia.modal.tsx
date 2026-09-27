"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Selector } from "~/components/acceso/Selector";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "~/components/ui/alert-dialog";
import type { ResolucionAusenciaProps } from "../../Models/ausencias.model";
import { fechaAusencia } from "../../Helpers/ausencias.helper";
export function ResolverAusenciaModal({
  ausencia,
  decision,
  onCerrar,
  onGuardado,
}: ResolucionAusenciaProps) {
  const [cuenta, setCuenta] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const opciones = {
    onSuccess: async () => {
      await utils.ausencias.invalidate();
      onGuardado();
    },
    onError: async () => {
      await utils.ausencias.invalidate();
    },
  };
  const aprobar = api.ausencias.aprobar.useMutation(opciones);
  const rechazar = api.ausencias.rechazar.useMutation(opciones);
  const pendiente = aprobar.isPending || rechazar.isPending;
  const titulo =
    decision === "aprobar" ? "Aprobar solicitud" : "Rechazar solicitud";
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pendiente) onCerrar();
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            Solicitud #{ausencia.id} de {ausencia.empleado.nombre}, del{" "}
            {fechaAusencia(ausencia.fechaInicio)} al{" "}
            {fechaAusencia(ausencia.fechaFin)}. Esta resolución es definitiva y
            no podrá revertirse.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm wrap-break-word whitespace-pre-wrap">
          {ausencia.motivo}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium">A cuenta de salario</p>
          <Selector
            etiqueta="A cuenta de salario"
            valor={cuenta}
            onChange={setCuenta}
            disabled={pendiente}
            opciones={[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resolucion-comentario">
            Comentario de resolución (opcional)
          </Label>
          <Textarea
            id="resolucion-comentario"
            value={comentario}
            maxLength={500}
            disabled={pendiente}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>
        <ErrorAcceso
          mensaje={error ?? aprobar.error?.message ?? rechazar.error?.message}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pendiente}
            onClick={(e) => {
              e.preventDefault();
              if (pendiente) return;
              if (!cuenta) {
                setError("Indica si la ausencia es a cuenta de salario.");
                return;
              }
              setError(null);
              const input = {
                id: ausencia.id,
                version: ausencia.version,
                aCuentaSalario: cuenta === "si",
                comentarioResolucion: comentario,
              };
              if (decision === "aprobar") aprobar.mutate(input);
              else rechazar.mutate(input);
            }}
          >
            {pendiente ? "Guardando…" : titulo}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
