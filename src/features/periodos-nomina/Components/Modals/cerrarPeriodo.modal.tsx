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
import { formatPeriodo } from "../../Helpers/periodos-nomina.helper";
import type { CerrarPeriodoProps } from "../../Models/cerrarPeriodo.model";
export function CerrarPeriodoModal({
  periodo,
  onCancelar,
}: CerrarPeriodoProps) {
  const utils = api.useUtils();
  const cerrar = api.periodosNomina.cerrar.useMutation({
    onSuccess: async () => {
      await utils.periodosNomina.listar.invalidate();
      onCancelar();
    },
  });
  return (
    <AlertDialog
      open={!!periodo}
      onOpenChange={(open) => {
        if (!open && !cerrar.isPending) onCancelar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cerrar período de nómina</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a cerrar{" "}
            <strong>
              {periodo ? formatPeriodo(periodo.mes, periodo.anio) : ""}
            </strong>
            . Después del cierre no se podrán registrar nuevas novedades ni
            modificar la información operativa asociada a este período.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAcceso mensaje={cerrar.error?.message} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cerrar.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={cerrar.isPending}
            onClick={() => {
              if (periodo) cerrar.mutate({ id: periodo.id });
            }}
          >
            {cerrar.isPending ? "Cerrando..." : "Confirmar cierre"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
