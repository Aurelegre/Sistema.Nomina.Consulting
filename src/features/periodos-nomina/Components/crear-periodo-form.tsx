"use client";
import { useMemo, useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Selector } from "~/components/acceso/Selector";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { MESES } from "../Helpers/periodos-nomina.helper";
export function CrearPeriodoForm() {
  const ahora = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(String(ahora.getMonth() + 1));
  const [anio, setAnio] = useState(String(ahora.getFullYear()));
  const utils = api.useUtils();
  const crear = api.periodosNomina.crear.useMutation({
    onSuccess: async () => {
      await utils.periodosNomina.listar.invalidate();
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Crear período de nómina</h2>
        </CardTitle>
        <CardDescription>
          Cada combinación de mes y año puede existir una sola vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            crear.mutate({ mes: Number(mes), anio: Number(anio) });
          }}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">Mes</p>
            <Selector
              etiqueta="Mes"
              valor={mes}
              onChange={setMes}
              opciones={MESES.map((label, index) => ({
                value: String(index + 1),
                label,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anio">Año</Label>
            <Input
              id="anio"
              type="number"
              min={1}
              step={1}
              required
              value={anio}
              onChange={(event) => setAnio(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending ? "Creando..." : "Crear período"}
          </Button>
        </form>
        <ErrorAcceso mensaje={crear.error?.message} />
      </CardContent>
    </Card>
  );
}
