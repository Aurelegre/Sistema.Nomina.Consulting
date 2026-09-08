"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { textoFormulario } from "~/shared/form-data";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";

export function PrimeraPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const cambio = api.auth.cambiarPrimeraPassword.useMutation({
    onSuccess: () => window.location.assign("/login"),
  });
  const logout = api.auth.logout.useMutation({
    onSuccess: () => window.location.assign("/login"),
  });
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cambia tu contraseña temporal</DialogTitle>
          <DialogDescription>
            Antes de acceder al sistema, elige una contraseña de al menos 12
            caracteres. Después deberás iniciar sesión con ella.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const datos = new FormData(event.currentTarget);
            const actual = textoFormulario(datos, "actual");
            const nueva = textoFormulario(datos, "nueva");
            const confirmacion = textoFormulario(datos, "confirmacion");
            if (nueva !== confirmacion) {
              setError("Las contraseñas nuevas no coinciden");
              return;
            }
            cambio.mutate({ passwordActual: actual, nuevaPassword: nueva });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="actual">Contraseña temporal</Label>
            <Input
              id="actual"
              name="actual"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input
              id="nueva"
              name="nueva"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacion">Confirmar nueva contraseña</Label>
            <Input
              id="confirmacion"
              name="confirmacion"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </div>
          {(error ?? cambio.error ?? logout.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {error ?? cambio.error?.message ?? logout.error?.message}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={cambio.isPending || logout.isPending}
            >
              Guardar contraseña
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={cambio.isPending || logout.isPending}
              onClick={() => logout.mutate()}
            >
              Cerrar sesión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
