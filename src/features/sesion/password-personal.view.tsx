"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { cambioPasswordSchema } from "~/shared/cambio-password.schema";
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
  DialogFooter,
} from "~/components/ui/dialog";
export function PasswordPersonalView() {
  const [abierto, setAbierto] = useState(false),
    [mensaje, setMensaje] = useState(""),
    [completado, setCompletado] = useState(false);
  const [campos, setCampos] = useState({
    passwordActual: "",
    nuevaPassword: "",
    confirmarPassword: "",
  });
  const queryClient = useQueryClient();
  const cambiar = api.auth.cambiarPasswordPersonal.useMutation({
    onSuccess: () => {
      setCampos({
        passwordActual: "",
        nuevaPassword: "",
        confirmarPassword: "",
      });
      setAbierto(false);
      setCompletado(true);
      queryClient.clear();
    },
    onError: (e) => setMensaje(e.message),
  });
  const cerrar = (v: boolean) => {
    if (cambiar.isPending) return;
    setAbierto(v);
    setMensaje("");
    setCampos({ passwordActual: "", nuevaPassword: "", confirmarPassword: "" });
  };
  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <h2 className="text-3xl font-semibold">Cambiar contraseña</h2>
      <p>
        Actualiza la contraseña de tu cuenta. Al guardarla se cerrarán todas tus
        sesiones y deberás iniciar sesión con la nueva contraseña.
      </p>
      {completado ? (
        <Alert>
          <AlertDescription role="status">
            Contraseña actualizada. Tus sesiones se cerraron.
          </AlertDescription>
          <Button
            className="mt-3"
            onClick={() => window.location.assign("/login")}
          >
            Ir a iniciar sesión
          </Button>
        </Alert>
      ) : (
        <Button onClick={() => cerrar(true)}>Cambiar mi contraseña</Button>
      )}
      <Dialog open={abierto} onOpenChange={cerrar}>
        <DialogContent showCloseButton={!cambiar.isPending}>
          <DialogHeader>
            <DialogTitle>Cambiar mi contraseña</DialogTitle>
            <DialogDescription>
              Usa entre 12 y 128 caracteres. La nueva contraseña debe ser
              diferente de la actual.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (cambiar.isPending) return;
              const r = cambioPasswordSchema.safeParse(campos);
              if (!r.success) {
                setMensaje(r.error.issues[0]?.message ?? "Revisa los campos");
                return;
              }
              setMensaje("");
              cambiar.mutate(r.data);
            }}
          >
            {(
              [
                {
                  key: "passwordActual",
                  label: "Contraseña actual",
                  autocomplete: "current-password",
                },
                {
                  key: "nuevaPassword",
                  label: "Nueva contraseña",
                  autocomplete: "new-password",
                },
                {
                  key: "confirmarPassword",
                  label: "Confirmar nueva contraseña",
                  autocomplete: "new-password",
                },
              ] as const
            ).map((c) => (
              <div key={c.key} className="space-y-2">
                <Label htmlFor={c.key}>{c.label}</Label>
                <Input
                  id={c.key}
                  name={c.key}
                  type="password"
                  autoComplete={c.autocomplete}
                  required
                  maxLength={128}
                  minLength={c.key === "nuevaPassword" ? 12 : 1}
                  disabled={cambiar.isPending}
                  value={campos[c.key]}
                  onChange={(e) =>
                    setCampos({ ...campos, [c.key]: e.target.value })
                  }
                />
              </div>
            ))}
            {mensaje && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{mensaje}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={cambiar.isPending}
                onClick={() => cerrar(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={cambiar.isPending}>
                {cambiar.isPending ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
