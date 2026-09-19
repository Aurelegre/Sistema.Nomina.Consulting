"use client";
import { useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { desactivarEmpleadoSchema } from "~/server/empleados/Models/empleados.schema";
import { fechaInput, hoyGuatemala } from "../../Helpers/empleados.helper";
import type { ConfirmarEmpleadoProps } from "../../Models/empleados.model";
export function ConfirmarEmpleadoModal({
  empleado,
  accion,
  onCerrar,
  onGuardado,
}: ConfirmarEmpleadoProps) {
  const [fechaSalida, setFechaSalida] = useState(hoyGuatemala());
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const opciones = {
    onSuccess: async () => {
      await utils.empleados.invalidate();
      onGuardado();
    },
    onError: async () => {
      await utils.empleados.invalidate();
    },
  };
  const baja = api.empleados.despedir.useMutation(opciones);
  const recontratar = api.empleados.recontratar.useMutation(opciones);
  const pendiente = baja.isPending || recontratar.isPending;
  const titulo =
    accion === "baja" ? "Dar de baja al empleado" : "Recontratar empleado";
  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !pendiente) onCerrar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            {accion === "baja"
              ? `${empleado.nombre} quedará inactivo. Su información se conservará para consulta.`
              : `${empleado.nombre} volverá a estar activo. Se conservarán la fecha de ingreso y el salario base actuales y se eliminará la fecha de salida.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {accion === "baja" && (
          <div className="space-y-2">
            <Label htmlFor="empleado-salida">Fecha de salida</Label>
            <Input
              id="empleado-salida"
              type="date"
              min={fechaInput(empleado.fechaIngreso)}
              value={fechaSalida}
              disabled={pendiente}
              onChange={(e) => setFechaSalida(e.target.value)}
            />
          </div>
        )}
        <ErrorAcceso
          mensaje={error ?? baja.error?.message ?? recontratar.error?.message}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pendiente}
            onClick={(event) => {
              event.preventDefault();
              if (pendiente) return;
              setError(null);
              const registro = { id: empleado.id, version: empleado.version };
              if (accion === "recontratar") {
                recontratar.mutate(registro);
                return;
              }
              const resultado = desactivarEmpleadoSchema.safeParse({
                ...registro,
                fechaSalida,
              });
              if (!resultado.success) {
                setError("Ingresa una fecha de salida válida.");
                return;
              }
              if (resultado.data.fechaSalida < empleado.fechaIngreso) {
                setError(
                  "La fecha de salida no puede ser anterior a la fecha de ingreso.",
                );
                return;
              }
              baja.mutate(resultado.data);
            }}
          >
            {pendiente ? "Guardando…" : titulo}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
