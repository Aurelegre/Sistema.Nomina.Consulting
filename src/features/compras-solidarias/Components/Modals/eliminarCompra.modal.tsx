"use client";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { montoCompra } from "../../Helpers/compras-solidarias.helper";
import type { Compra } from "../../Models/compras-solidarias.model";
export function EliminarCompraModal({
  compra,
  onCerrar,
  onEliminado,
}: {
  compra: Compra;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const utils = api.useUtils();
  const eliminar = api.comprasSolidarias.eliminar.useMutation({
    onSuccess: () => {
      void utils.comprasSolidarias.invalidate();
      onEliminado();
    },
  });
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !eliminar.isPending) onCerrar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar compra solidaria</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la compra de {montoCompra(compra.monto)} de{" "}
            {compra.empleado.nombre}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="break-words">{compra.detalle}</p>
        <ErrorAcceso mensaje={eliminar.error?.message} />
        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={eliminar.isPending}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={eliminar.isPending}
            onClick={() =>
              eliminar.mutate({ id: compra.id, version: compra.version })
            }
          >
            {eliminar.isPending ? "Eliminando…" : "Eliminar compra"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
