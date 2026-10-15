"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { crearAusenciaSchema } from "~/server/ausencias/Models/ausencias.schema";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import type { ModalAusenciaProps } from "../../Models/ausencias.model";
export function CrearAusenciaModal({
  onCerrar,
  onGuardado,
}: ModalAusenciaProps) {
  const [fechaInicio, setInicio] = useState("");
  const [fechaFin, setFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const crear = api.ausencias.crear.useMutation({
    onSuccess: async () => {
      await utils.ausencias.invalidate();
      onGuardado();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !crear.isPending) onCerrar();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!crear.isPending}
      >
        <DialogHeader>
          <DialogTitle>Crear solicitud de ausencia</DialogTitle>
          <DialogDescription>
            La solicitud se registrará para ti. Las fechas deben pertenecer al
            mismo mes y año.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (crear.isPending) return;
            setError(null);
            const input = { fechaInicio, fechaFin, motivo };
            const resultado = crearAusenciaSchema.safeParse(input);
            if (!resultado.success) {
              setError(
                resultado.error.issues[0]?.message ?? "Revisa los datos",
              );
              return;
            }
            crear.mutate(input);
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ausencia-inicio">Fecha de inicio</Label>
              <Input
                id="ausencia-inicio"
                type="date"
                required
                min="1900-01-01"
                value={fechaInicio}
                disabled={crear.isPending}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ausencia-fin">Fecha de fin</Label>
              <Input
                id="ausencia-fin"
                type="date"
                required
                min={fechaInicio || "1900-01-01"}
                value={fechaFin}
                disabled={crear.isPending}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ausencia-motivo">Motivo</Label>
            <Textarea
              id="ausencia-motivo"
              required
              maxLength={500}
              value={motivo}
              disabled={crear.isPending}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {motivo.length}/500 caracteres
            </p>
          </div>
          <ErrorAcceso mensaje={error ?? crear.error?.message} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={crear.isPending}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Guardando…" : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
