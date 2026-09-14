"use client";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { textoFormulario } from "~/shared/form-data";
import { useHidratado } from "~/shared/use-hidratado";
import { api } from "~/trpc/react";

export function LoginForm() {
  const listo = useHidratado();
  const login = api.auth.login.useMutation({
    onSuccess: ({ debeCambiarPassword }) =>
      window.location.assign(debeCambiarPassword ? "/cambiar-password" : "/"),
  });
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Iniciar sesión · Consulting, S.A.</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          method="post"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const datos = new FormData(event.currentTarget);
            login.mutate({
              username: textoFormulario(datos, "username"),
              password: textoFormulario(datos, "password"),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              disabled={!listo}
              name="username"
              autoComplete="username"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              disabled={!listo}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          {login.error && (
            <Alert variant="destructive">
              <AlertDescription>{login.error.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={!listo || login.isPending}>
            {login.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
