"use client";

import { api } from "~/trpc/react";
import { textoFormulario } from "~/shared/form-data";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";

export function LoginForm() {
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
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
