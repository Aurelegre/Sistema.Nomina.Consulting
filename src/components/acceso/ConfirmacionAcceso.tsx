"use client";
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
import { ErrorAcceso } from "./ErrorAcceso";
export function ConfirmacionAcceso({
  titulo,
  descripcion,
  abierto,
  pendiente,
  error,
  onClose,
  onConfirm,
}: {
  titulo: string;
  descripcion: string;
  abierto: boolean;
  pendiente: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open && !pendiente) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAcceso mensaje={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pendiente} onClick={onConfirm}>
            {pendiente ? "Guardando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
