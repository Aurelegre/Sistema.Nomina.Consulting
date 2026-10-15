"use client";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
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
    <Card className="w-full gap-7 rounded-2xl border-slate-200/80 bg-white py-8 shadow-sm sm:py-10">
      <CardHeader className="gap-3 px-6 sm:px-9">
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Acceso al portal
        </p>
        <CardTitle>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Iniciar sesión
          </h1>
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          Ingresa tus credenciales para acceder al sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 sm:px-9">
        <form
          method="post"
          className="space-y-6"
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
              className="h-12 rounded-lg border-slate-300 bg-white px-3 text-base shadow-none"
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
              className="h-12 rounded-lg border-slate-300 bg-white px-3 text-base shadow-none"
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
          <Button
            className="h-12 w-full rounded-lg text-sm font-semibold"
            type="submit"
            disabled={!listo || login.isPending}
          >
            {login.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
