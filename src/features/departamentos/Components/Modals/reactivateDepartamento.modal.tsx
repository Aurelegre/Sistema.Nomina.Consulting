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
import type { ReactivateDepartamentoProps } from "../../Models/reactivateDepartamento.model";

export function ReactivateDepartamentoModal({
  departamento,
  onCerrar,
  onGuardado,
}: ReactivateDepartamentoProps) {
  const utils = api.useUtils();
  const reactivar = api.departamentos.reactivar.useMutation({
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
        if (!abierto && !reactivar.isPending) onCerrar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivar departamento</AlertDialogTitle>
          <AlertDialogDescription>
            El departamento {departamento.nombre} quedará activo y podrá ser
            utilizado nuevamente en el sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAcceso mensaje={reactivar.error?.message} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reactivar.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={reactivar.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!reactivar.isPending)
                reactivar.mutate({
                  id: departamento.id,
                  version: departamento.version,
                });
            }}
          >
            {reactivar.isPending ? "Reactivando…" : "Reactivar departamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
