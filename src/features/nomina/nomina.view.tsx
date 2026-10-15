"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { DetalleNominaModal } from "./Components/Modals/detalleNomina.modal";
import { dinero, fechaTexto, periodoTexto } from "./Helpers/nomina.helper";
import { useSeguimientoNomina } from "./Hooks/seguimiento-nomina";

export function NominaView({ propia = false }: { propia?: boolean }) {
  const utils = api.useUtils();
  const seguimiento = useSeguimientoNomina();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const contexto = api.nomina.contexto.useQuery(undefined, {
    enabled: !propia,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const permisos = contexto.data?.permisos ?? [];
  const puedeVer = permisos.includes("PAYROLL.VIEW");
  const puedeGenerar = permisos.includes("PAYROLL.PROCESS");
  const filtros = {
    desde: desde || undefined,
    hasta: hasta || undefined,
    pagina,
  };
  const rangoValido = !desde || !hasta || desde <= hasta;
  const admin = api.nomina.listar.useQuery(filtros, {
    enabled: !propia && puedeVer && rangoValido,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const personal = api.nomina.misNominas.useQuery(filtros, {
    enabled: propia && rangoValido,
  });
  const consulta = propia ? personal : admin;
  const ejecuciones = api.nomina.ejecuciones.useQuery(undefined, {
    enabled: !propia && puedeGenerar,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const generar = api.nomina.generar.useMutation({
    onSuccess: async ({ id }) => {
      await seguimiento.iniciar(id);
      setConfirmar(false);
      setMensaje(
        "La generación quedó en cola. Puedes continuar usando el sistema; te avisaremos al finalizar.",
      );
      await utils.nomina.invalidate();
    },
    onError: (e) => {
      setMensaje(e.message);
      setConfirmar(false);
    },
  });
  const exportar = api.nomina.exportar.useMutation({
    onSuccess: (archivo) => {
      const url = URL.createObjectURL(
        new Blob([archivo.contenido], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = archivo.nombre;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => setMensaje(e.message),
  });
  const activo = contexto.data?.activo;
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">
          {propia ? "Mi Nómina" : "Nómina"}
        </h2>
        <p className="text-muted-foreground mt-2">
          {propia
            ? "Consulta el histórico de tus ingresos, deducciones y pagos mensuales."
            : "Genera la planilla del período abierto y consulta los resultados históricos."}
        </p>
      </div>
      {mensaje && <p role="status">{mensaje}</p>}
      {contexto.error && !propia && (
        <p role="alert">{contexto.error.message}</p>
      )}
      {!propia && puedeGenerar && (
        <Card>
          <CardHeader>
            <CardTitle>Generación de planilla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              {activo
                ? `Período: ${periodoTexto(activo)} · ${activo.estado}`
                : "No hay un período abierto. Crea uno desde Períodos para generar la nómina."}
            </p>
            {activo?.estado === "PROCESANDO" && (
              <p role="status">
                La nómina está pendiente o en procesamiento. Los movimientos del
                período están protegidos.
              </p>
            )}
            <Button
              disabled={
                activo?.estado !== "ABIERTO" || generar.isPending
              }
              onClick={() => {
                setMensaje("");
                setConfirmar(true);
              }}
            >
              Generar nómina
            </Button>
            {ejecuciones.data?.map((e) => (
              <p key={e.id}>
                #{e.id} · {periodoTexto(e.periodo)} · <Badge>{e.estado}</Badge>
                {e.error && ` · ${e.error}`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
      {(propia || puedeVer) && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico mensual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <Label htmlFor="desde-nomina">Desde el período</Label>
                <Input
                  id="desde-nomina"
                  type="month"
                  value={desde}
                  onChange={(e) => {
                    setDesde(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="hasta-nomina">Hasta el período</Label>
                <Input
                  id="hasta-nomina"
                  type="month"
                  value={hasta}
                  onChange={(e) => {
                    setHasta(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>
            {!rangoValido && (
              <p role="alert">
                El período inicial debe ser anterior o igual al final.
              </p>
            )}
            {consulta.error && <p role="alert">{consulta.error.message}</p>}
            {consulta.isPending && rangoValido ? (
              <p>Cargando nóminas…</p>
            ) : consulta.data?.filas.length === 0 ? (
              <p>No hay nóminas para los filtros seleccionados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Generación</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Deducciones</TableHead>
                    <TableHead>Pago final</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consulta.data?.filas.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{periodoTexto(n.periodo)}</TableCell>
                      <TableCell>
                        <Badge>{n.estado}</Badge>
                      </TableCell>
                      <TableCell>{fechaTexto(n.fechaFin)}</TableCell>
                      <TableCell>
                        {n.estado === "COMPLETADA"
                          ? dinero(n.totalIngresos)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {n.estado === "COMPLETADA"
                          ? dinero(n.totalEgresos)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {n.estado === "COMPLETADA" ? dinero(n.totalPago) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {n.estado === "COMPLETADA" &&
                            (propia || permisos.includes("PAYROLL.DETAIL")) && (
                              <Button
                                variant="outline"
                                onClick={() => setDetalle(n.id)}
                              >
                                Detalle
                              </Button>
                            )}
                          {!propia &&
                            n.estado === "COMPLETADA" &&
                            permisos.includes("PAYROLL.EXPORT") && (
                              <Button
                                variant="outline"
                                disabled={exportar.isPending}
                                onClick={() => exportar.mutate({ id: n.id })}
                              >
                                CSV
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center gap-3">
              <Button
                disabled={pagina === 1}
                onClick={() => setPagina(pagina - 1)}
              >
                Anterior
              </Button>
              <span>Página {pagina}</span>
              <Button
                disabled={!consulta.data || pagina * 15 >= consulta.data.total}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {detalle !== null && (
        <DetalleNominaModal
          id={detalle}
          propia={propia}
          cerrar={() => setDetalle(null)}
        />
      )}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar y cerrar el período</AlertDialogTitle>
            <AlertDialogDescription>
              Se calculará la nómina de{" "}
              {activo ? periodoTexto(activo) : "este período"}. Al finalizar
              correctamente, el período quedará cerrado y sus resultados serán
              definitivos.
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
              disabled={!activo || generar.isPending}
              onClick={() => {
                if (activo) generar.mutate({ periodoId: activo.id });
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
