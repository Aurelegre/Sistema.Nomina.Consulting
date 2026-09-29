"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import type {
  ContextoNovedades,
  EmpleadoDepartamento,
  TipoNovedad,
} from "./Models/novedades.model";
import { etiquetaPeriodo } from "./Helpers/novedades.helper";
import { EmpleadosDepartamentoTable } from "./Components/empleadosDepartamento-table";
import { RegistrarNovedadModal } from "./Components/Modals/registrarNovedad.modal";
import { DetalleEmpleadoDepartamentoModal } from "./Components/Modals/detalleEmpleadoDepartamento.modal";

export function NovedadesView({
  contextoInicial,
}: {
  contextoInicial: ContextoNovedades;
}) {
  const utils = api.useUtils();
  const contexto = api.novedades.contexto.useQuery(undefined, {
    initialData: contextoInicial,
  });
  const [periodoId, setPeriodoId] = useState<number | undefined>(
    () =>
      contextoInicial.periodos.find((p) => p.estado === "ABIERTO")?.id ??
      contextoInicial.periodos[0]?.id,
  );
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [registro, setRegistro] = useState<{
    empleado: EmpleadoDepartamento;
    tipo: TipoNovedad;
  } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const consulta = api.novedades.listar.useQuery({
    periodoId,
    busqueda,
    pagina,
  });
  const periodo = contexto.data.periodos.find((p) => p.id === periodoId);
  const abierto = periodo?.estado === "ABIERTO";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Empleados de mi departamento</h1>
        <p className="text-muted-foreground">
          {contexto.data.departamento.nombre} · Novedades para la planilla
          mensual
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Acumulados por período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodo-novedades">Período de planilla</Label>
              <Select
                value={periodoId ? String(periodoId) : ""}
                onValueChange={(valor) => {
                  setPeriodoId(Number(valor));
                  setPagina(1);
                  setMensaje("");
                }}
              >
                <SelectTrigger id="periodo-novedades" className="w-full">
                  <SelectValue>
                    {periodo
                      ? etiquetaPeriodo(periodo)
                      : "Selecciona un período"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contexto.data.periodos.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {etiquetaPeriodo(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buscar-empleado-departamento">
                Buscar empleado
              </Label>
              <Input
                id="buscar-empleado-departamento"
                value={busqueda}
                maxLength={150}
                placeholder="Nombre o código"
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </div>
          {!periodo && (
            <p role="status">
              No hay períodos disponibles. Solicita su creación al responsable
              de planilla.
            </p>
          )}
          {periodo && !abierto && (
            <p role="status">Período cerrado: solo consulta.</p>
          )}
          <p className="text-muted-foreground text-sm">
            Cada registro agrega una cantidad al período. Los importes de pago
            se calcularán al procesar la nómina. Los acumulados mostrados
            corresponden a registros de este departamento.
          </p>
          {mensaje && <p role="status">{mensaje}</p>}
          <ErrorAcceso
            mensaje={contexto.error?.message ?? consulta.error?.message}
          />
          {(consulta.isError || contexto.isError) && (
            <Button
              variant="outline"
              onClick={() => {
                void consulta.refetch();
                void contexto.refetch();
              }}
            >
              Reintentar
            </Button>
          )}
          {consulta.isPending && <p role="status">Cargando empleados…</p>}
          {!consulta.isError && !contexto.isError && consulta.data && (
            <EmpleadosDepartamentoTable
              filas={consulta.data.filas}
              contexto={contexto.data}
              abierto={abierto}
              onDetalle={setDetalle}
              onRegistro={(empleado, tipo) => {
                setRegistro({ empleado, tipo });
                setMensaje("");
              }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              {consulta.data?.total ?? 0} empleados · Página {pagina}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagina === 1 || consulta.isFetching}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={
                  !consulta.data ||
                  pagina * 20 >= consulta.data.total ||
                  consulta.isFetching
                }
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {detalle !== null && (
        <DetalleEmpleadoDepartamentoModal
          empleadoId={detalle}
          onCerrar={() => setDetalle(null)}
        />
      )}
      {registro && periodo && (
        <RegistrarNovedadModal
          {...registro}
          periodoId={periodo.id}
          periodoEtiqueta={etiquetaPeriodo(periodo)}
          onCerrar={() => setRegistro(null)}
          onGuardado={() => {
            setRegistro(null);
            setMensaje("Registro guardado y sumado al período.");
            void utils.novedades.invalidate();
          }}
        />
      )}
    </div>
  );
}
