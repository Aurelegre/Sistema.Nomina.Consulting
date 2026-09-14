"use client";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import type { CredencialUsuarioModalProps } from "../../Models/credencialUsuario.model";
export function CredencialUsuarioModal({
  credencial,
  cerrarCredencial,
  copiado,
  setCopiado,
  accion,
}: CredencialUsuarioModalProps) {
  return (
    <Dialog
      open={!!credencial}
      onOpenChange={(open) => {
        if (!open) cerrarCredencial();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraseña temporal</DialogTitle>
          <DialogDescription>
            Copia esta contraseña y entrégala al usuario. Al cerrar este diálogo
            no volverá a mostrarse.
          </DialogDescription>
        </DialogHeader>
        {credencial && (
          <>
            <p>
              Usuario: <strong>{credencial.username}</strong>
            </p>
            <Input
              aria-label="Contraseña temporal generada"
              readOnly
              value={credencial.passwordTemporal}
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      credencial.passwordTemporal,
                    );
                    setCopiado(true);
                  } catch {
                    accion.setError(
                      "No se pudo copiar. Selecciona y copia la contraseña manualmente.",
                    );
                  }
                }}
              >
                {copiado ? "Copiada" : "Copiar contraseña"}
              </Button>
              <Button variant="outline" onClick={cerrarCredencial}>
                {credencial.propiaCuenta ? "Ir al login" : "Cerrar"}
              </Button>
            </div>
            <ErrorAcceso mensaje={accion.error} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
