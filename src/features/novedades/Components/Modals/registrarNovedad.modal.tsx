"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { etiquetasNovedad } from "../../Helpers/novedades.helper";
import type {
  EmpleadoDepartamento,
  TipoNovedad,
} from "../../Models/novedades.model";

export function RegistrarNovedadModal({
  empleado,
  tipo,
  periodoId,
  periodoEtiqueta,
  onCerrar,
  onGuardado,
}: {
  empleado: EmpleadoDepartamento;
  tipo: TipoNovedad;
  periodoId: number;
  periodoEtiqueta: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [solicitudId] = useState(() => crypto.randomUUID());
  const guardar = api.novedades.registrar.useMutation({
    onSuccess: onGuardado,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !guardar.isPending) onCerrar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Registrar {etiquetasNovedad[tipo].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            {empleado.nombre} · {periodoEtiqueta}. La cantidad se sumará al
            acumulado del período.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!guardar.isPending)
              guardar.mutate({
                solicitudId,
                empleadoId: empleado.id,
                periodoId,
                tipo,
                cantidad,
              });
          }}
        >
          <p>
            Acumulado actual: {tipo === "VENTAS" ? "Q " : ""}
            {empleado.acumulados[tipo]}
          </p>
          <div className="space-y-2">
            <Label htmlFor="cantidad-novedad">
              {tipo === "VENTAS"
                ? "Monto adicional de ventas (Q)"
                : tipo === "PIEZAS"
                  ? "Cantidad de piezas"
                  : "Cantidad de horas"}
            </Label>
            <Input
              id="cantidad-novedad"
              type="number"
              min={tipo === "PIEZAS" ? "1" : "0.01"}
              max="9999999999.99"
              step={tipo === "PIEZAS" ? "1" : "0.01"}
              required
              value={cantidad}
              disabled={guardar.isPending}
              onChange={(event) => setCantidad(event.target.value)}
            />
          </div>
          <ErrorAcceso mensaje={guardar.error?.message} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={guardar.isPending}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? "Guardando…" : "Guardar registro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
