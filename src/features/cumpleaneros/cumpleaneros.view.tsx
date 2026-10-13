"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
type RouterOutputs = inferRouterOutputs<AppRouter>;
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import {
  mesesCumpleaneros,
  estadosCumpleaneros,
  fechaCumpleanos,
} from "~/shared/cumpleaneros";
export function CumpleanerosView() {
  const contexto = api.cumpleaneros.contexto.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  return (
    <main className="mx-auto max-w-7xl space-y-5">
      <div>
        <h2 className="text-3xl font-semibold">Cumpleañeros</h2>
        <p className="text-muted-foreground mt-2">
          Consulta los cumpleaños por mes con la información actual de los
          empleados.
        </p>
      </div>
      {contexto.isLoading && <p role="status">Cargando filtros…</p>}
      {contexto.error && (
        <Alert variant="destructive">
          <AlertDescription>{contexto.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => void contexto.refetch()}>
            Reintentar
          </Button>
        </Alert>
      )}
      {contexto.data && <Consulta contexto={contexto.data} />}
    </main>
  );
}
function Consulta({
  contexto,
}: {
  contexto: RouterOutputs["cumpleaneros"]["contexto"];
}) {
  const [filtros, setFiltros] = useState({
    mes: contexto.mes,
    estado: "ACTIVO" as keyof typeof estadosCumpleaneros,
    departamentoId: undefined as number | undefined,
  });
  const [borrador, setBorrador] = useState(filtros);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const lista = api.cumpleaneros.listar.useQuery(filtros, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const exportar = api.cumpleaneros.exportar.useMutation({
    onSuccess: (archivo) => {
      const bytes = Uint8Array.from(atob(archivo.base64), (c) =>
        c.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: archivo.tipo }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo.nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (e) => setError(e.message),
  });
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={exportar.isPending}
          onClick={() => {
            setBorrador(filtros);
            setAbierto(true);
          }}
        >
          Filtros
        </Button>
        <Button
          variant="outline"
          disabled={lista.isFetching || exportar.isPending}
          onClick={() => void lista.refetch()}
        >
          Actualizar
        </Button>
        {contexto.puedeExportar &&
          (["csv", "pdf"] as const).map((formato) => (
            <Button
              key={formato}
              variant="outline"
              disabled={
                !lista.data ||
                lista.isFetching ||
                !!lista.error ||
                exportar.isPending
              }
              onClick={() => {
                setError("");
                exportar.mutate({ ...filtros, formato });
              }}
            >
              Exportar {formato.toUpperCase()}
            </Button>
          ))}
      </div>
      <p className="text-muted-foreground">
        {mesesCumpleaneros[filtros.mes - 1]?.nombre} ·{" "}
        {estadosCumpleaneros[filtros.estado]} ·{" "}
        {contexto.departamentos.find((d) => d.id === filtros.departamentoId)
          ?.nombre ?? "Todos los departamentos"}
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {lista.error && (
        <Alert variant="destructive">
          <AlertDescription>{lista.error.message}</AlertDescription>
        </Alert>
      )}
      {lista.isFetching ? (
        <p role="status">Consultando cumpleañeros…</p>
      ) : (
        !lista.error &&
        lista.data && (
          <>
            <p role="status">Total: {lista.data.total} empleados</p>
            <Table>
              <TableCaption>
                Cumpleaños ordenados por día y nombre.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cumpleaños</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.data.filas.map((r) => (
                  <TableRow key={r.codigo}>
                    <TableCell>{r.codigo}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell>{r.departamento}</TableCell>
                    <TableCell>
                      {fechaCumpleanos(r.dia, lista.data.mes)}
                    </TableCell>
                  </TableRow>
                ))}
                {!lista.data.total && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      No hay cumpleañeros con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar cumpleañeros</DialogTitle>
            <DialogDescription>
              Selecciona el mes, estado y departamento que deseas consultar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cumple-mes">Mes</Label>
              <Select
                value={String(borrador.mes)}
                onValueChange={(v) =>
                  setBorrador({ ...borrador, mes: Number(v) })
                }
              >
                <SelectTrigger id="cumple-mes" className="w-full">
                  <SelectValue>
                    {mesesCumpleaneros[borrador.mes - 1]?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mesesCumpleaneros.map((m) => (
                    <SelectItem key={m.valor} value={String(m.valor)}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cumple-estado">Estado</Label>
              <Select
                value={borrador.estado}
                onValueChange={(v) => {
                  if (v && v in estadosCumpleaneros)
                    setBorrador({
                      ...borrador,
                      estado: v,
                    });
                }}
              >
                <SelectTrigger id="cumple-estado" className="w-full">
                  <SelectValue>
                    {estadosCumpleaneros[borrador.estado]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(estadosCumpleaneros).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cumple-departamento">Departamento</Label>
              <Select
                value={String(borrador.departamentoId ?? "todos")}
                onValueChange={(v) =>
                  setBorrador({
                    ...borrador,
                    departamentoId: v === "todos" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger id="cumple-departamento" className="w-full">
                  <SelectValue>
                    {contexto.departamentos.find(
                      (d) => d.id === borrador.departamentoId,
                    )?.nombre ?? "Todos los departamentos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los departamentos</SelectItem>
                  {contexto.departamentos.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setFiltros(borrador);
                setError("");
                setAbierto(false);
              }}
            >
              Aplicar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
