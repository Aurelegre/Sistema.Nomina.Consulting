"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { valorValido } from "~/shared/configuraciones.schema";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
export function ConfiguracionesView() {
  const consulta = api.configuraciones.listar.useQuery();
  const [id, setId] = useState<number | null>(null),
    [valor, setValor] = useState(""),
    [version, setVersion] = useState(0),
    [mensaje, setMensaje] = useState("");
  const fila = consulta.data?.filas.find((f) => f.id === id);
  const editar = api.configuraciones.editar.useMutation({
    onSuccess: async () => {
      setId(null);
      setMensaje("Configuración actualizada.");
      await consulta.refetch();
    },
    onError: (e) => setMensaje(e.message),
  });
  return (
    <main className="space-y-5">
      <h2 className="text-3xl font-semibold">Configuraciones</h2>
      <p>
        Los valores se aplican a nuevas sesiones y nuevas generaciones de
        nómina. Las nóminas históricas conservan sus parámetros.
      </p>
      <p>
        Los porcentajes se ingresan como porcentaje: por ejemplo, 4.83. La
        deducción fiscal anual se conserva en los parámetros fiscales por
        ejercicio.
      </p>
      {consulta.isLoading && <p>Cargando configuraciones…</p>}
      {consulta.error && (
        <Alert variant="destructive">
          <AlertDescription>{consulta.error.message}</AlertDescription>
        </Alert>
      )}
      {mensaje && !fila && (
        <Alert>
          <AlertDescription role="status">{mensaje}</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consulta.data?.filas.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.descripcion}</TableCell>
              <TableCell>{f.valor}</TableCell>
              <TableCell>
                {consulta.data?.puedeEditar && f.regla && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setId(f.id);
                      setValor(f.valor);
                      setVersion(f.version);
                      setMensaje("");
                    }}
                    aria-label={`Editar ${f.descripcion}`}
                  >
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog
        open={!!fila}
        onOpenChange={(v) => {
          if (!v && !editar.isPending) {
            setId(null);
            setMensaje("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar configuración</DialogTitle>
            <DialogDescription>{fila?.descripcion}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!fila?.regla || editar.isPending) return;
              if (!valorValido(valor, fila.regla)) {
                setMensaje("Revisa el rango y la precisión del valor.");
                return;
              }
              setMensaje("");
              editar.mutate({ id: fila.id, version, valor });
            }}
          >
            <Label htmlFor="valor-configuracion">Valor</Label>
            <Input
              id="valor-configuracion"
              type="number"
              required
              min={fila?.regla?.min}
              max={fila?.regla?.max}
              step={fila?.regla?.decimales === 0 ? 1 : 0.01}
              value={valor}
              disabled={editar.isPending}
              onChange={(e) => setValor(e.target.value)}
            />
            <p>
              Rango permitido: {fila?.regla?.min} a {fila?.regla?.max}.{" "}
              {fila?.regla?.decimales === 0
                ? "Solo enteros."
                : "Hasta dos decimales."}
            </p>
            {mensaje && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{mensaje}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={editar.isPending}
                onClick={() => {
                  setId(null);
                  setMensaje("");
                }}
              >
                Cancelar
              </Button>
              <Button disabled={editar.isPending} type="submit">
                {editar.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
