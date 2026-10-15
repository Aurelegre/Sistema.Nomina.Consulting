"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { VistaPreviaPoliza } from "./Components/vista-previa-poliza";
import { periodoTexto } from "~/features/nomina/Helpers/nomina.helper";

export function PolizaView() {
  const utils = api.useUtils();
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const contexto = api.reportes.contexto.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const periodoId = seleccion ?? contexto.data?.periodos[0]?.id ?? null;
  const previa = api.reportes.previa.useQuery(
    { periodoId: periodoId ?? 0 },
    {
      enabled: periodoId !== null,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const permisos = contexto.data?.permisos ?? [];
  const generar = api.reportes.generar.useMutation({
    onSuccess: async () => {
      setConfirmar(false);
      setMensaje(
        "Reporte guardado. La vista previa muestra la información conservada.",
      );
      await Promise.all([
        utils.reportes.previa.invalidate(),
        utils.reportes.contexto.invalidate(),
      ]);
    },
    onError: (e) => {
      setConfirmar(false);
      setMensaje(e.message);
    },
  });
  const exportar = api.reportes.exportar.useMutation({
    onSuccess: (archivo) => {
      const bytes = Uint8Array.from(atob(archivo.base64), (c) =>
        c.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: archivo.tipo }),
      );
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.nombre;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (e) => setMensaje(e.message),
  });
  const documento = previa.data;
  return (
    <main className="mx-auto max-w-7xl space-y-5">
      <div>
        <h2 className="text-3xl font-semibold">Póliza contable</h2>
        <p className="text-muted-foreground mt-2">
          Reporte agrupado de obligaciones según el cierre de nómina.
        </p>
      </div>
      {contexto.error && (
        <Alert variant="destructive">
          <AlertDescription>{contexto.error.message}</AlertDescription>
        </Alert>
      )}
      {contexto.isLoading ? (
        <p role="status">Cargando períodos…</p>
      ) : contexto.data?.periodos.length === 0 ? (
        <p>No hay períodos cerrados con nómina completada.</p>
      ) : (
        contexto.data && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-2 sm:w-80">
              <Label htmlFor="periodo-poliza">Período de nómina</Label>
              <Select
                value={String(periodoId ?? "")}
                disabled={generar.isPending}
                onValueChange={(v) => {
                  setSeleccion(Number(v));
                  setMensaje("");
                  setConfirmar(false);
                }}
              >
                <SelectTrigger id="periodo-poliza" className="w-full">
                  <SelectValue>
                    {contexto.data.periodos.find((p) => p.id === periodoId)
                      ? periodoTexto(
                          contexto.data.periodos.find(
                            (p) => p.id === periodoId,
                          )!,
                        )
                      : "Selecciona un período"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contexto.data.periodos.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {periodoTexto(p)}
                      {p.nomina?.reportePoliza ? " · Guardado" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={previa.isFetching || generar.isPending || !periodoId}
              onClick={() => void previa.refetch()}
            >
              Actualizar vista previa
            </Button>
            {documento &&
              !previa.isFetching &&
              !documento.reporteId &&
              permisos.includes("ACCOUNTING_POLICY.GENERATE") && (
                <Button onClick={() => setConfirmar(true)}>
                  Generar reporte
                </Button>
              )}
            {documento?.reporteId &&
              permisos.includes("ACCOUNTING_POLICY.EXPORT") &&
              (["csv", "pdf"] as const).map((formato) => (
                <Button
                  key={formato}
                  variant="outline"
                  disabled={exportar.isPending || previa.isFetching}
                  onClick={() =>
                    exportar.mutate({ periodoId: periodoId!, formato })
                  }
                >
                  Exportar {formato.toUpperCase()}
                </Button>
              ))}
          </div>
        )
      )}
      {mensaje && (
        <Alert>
          <AlertDescription role="status">{mensaje}</AlertDescription>
        </Alert>
      )}
      {previa.error && (
        <Alert variant="destructive">
          <AlertDescription>{previa.error.message}</AlertDescription>
        </Alert>
      )}
      {previa.isFetching ? (
        <p role="status">Preparando vista previa…</p>
      ) : (
        documento && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={documento.reporteId ? "default" : "secondary"}>
                {documento.reporteId
                  ? `Reporte #${documento.reporteId} guardado`
                  : "Vista previa sin guardar"}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Importes negativos en rojo. Las cuentas sin movimientos figuran
                en cero.
              </span>
            </div>
            <VistaPreviaPoliza pdf={documento.pdf} />
          </>
        )
      )}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar reporte de póliza</AlertDialogTitle>
            <AlertDialogDescription>
              Se conservarán los importes y cuentas de la vista previa para este
              período. Las consultas posteriores cargarán este reporte sin
              recalcularlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={generar.isPending}
              onClick={() => setConfirmar(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                generar.isPending ||
                previa.isFetching ||
                !documento ||
                !periodoId
              }
              onClick={() => {
                if (documento && periodoId)
                  generar.mutate({ periodoId, huella: documento.huella });
              }}
            >
              Confirmar generación
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
