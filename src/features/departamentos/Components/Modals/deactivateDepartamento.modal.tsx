"use client";

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
import { api } from "~/trpc/react";
import type { DeactivateDepartamentoProps } from "../../Models/deactivateDepartamento.model";

export function DeactivateDepartamentoModal({
  departamento,
  onCerrar,
  onGuardado,
}: DeactivateDepartamentoProps) {
  const utils = api.useUtils();
  const desactivar = api.departamentos.desactivar.useMutation({
    onSuccess: async () => {
      await utils.departamentos.listar.invalidate();
      onGuardado();
    },
    onError: async (error) => {
      if (error.data?.code === "CONFLICT")
        await utils.departamentos.listar.invalidate();
    },
  });
  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !desactivar.isPending) onCerrar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desactivar departamento</AlertDialogTitle>
          <AlertDialogDescription>
            El departamento {departamento.nombre} quedará inactivo y seguirá
            visible en el listado. Sus datos se conservarán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAcceso mensaje={desactivar.error?.message} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={desactivar.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={desactivar.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!desactivar.isPending)
                desactivar.mutate({
                  id: departamento.id,
                  version: departamento.version,
                });
            }}
          >
            {desactivar.isPending ? "Desactivando…" : "Desactivar departamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
