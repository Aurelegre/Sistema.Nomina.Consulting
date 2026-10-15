import { useState } from "react";
import type {
  AmbitoAusencias,
  ContextoAusencias,
} from "../Models/ausencias.model";
import type { Ausencia } from "@prisma/client";
import { api } from "~/trpc/react";
import { listarAusenciasSchema } from "~/server/ausencias/Models/ausencias.schema";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Selector } from "~/components/acceso/Selector";
import { estadosAusencia } from "../Helpers/ausencias.helper";
import { Label } from "~/components/ui/label";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { AusenciasTable } from "./ausencias-table";
import { Paginacion } from "~/components/acceso/Paginacion";
import { DetalleAusenciaModal } from "./Modals/detalleAusencia.modal";

export function HistoricoAusencias({
  ambito,
  contexto,
}: {
  ambito: AmbitoAusencias;
  contexto: ContextoAusencias;
}) {
  const [busqueda, setBusqueda] = useState<string>("");
  const [estado, setEstado] = useState<Ausencia["estado"] | "todos">("todos");
  const [empleadoId, setEmpleado] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ingresadaDesde, setIngresadaDesde] = useState("");
  const [ingresadaHasta, setIngresadaHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const empleados = api.ausencias.empleadosRevision.useQuery(
    { ambito },
    {
      enabled: true,
    },
  );
  const entrada = {
    ambito,
    pagina,
    tamano: 15,
    busqueda,
    estado: estado === "todos" ? undefined : estado,
    empleadoId: empleadoId !== "todos" ? Number(empleadoId) : undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    ingresadaDesde: ingresadaDesde || undefined,
    ingresadaHasta: ingresadaHasta || undefined,
  };
  const validado = listarAusenciasSchema.safeParse(entrada);
  const solicitudes = api.ausencias.listar.useQuery(entrada, {
    enabled: validado.success,
  });

  function limpiar() {
    setBusqueda("");
    setEstado("todos");
    setEmpleado("todos");
    setDesde("");
    setHasta("");
    setIngresadaDesde("");
    setIngresadaHasta("");
    setPagina(1);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium">
          {"Historial de solicitudes de Empleados"}
        </h3>
      </div>
      {mensaje && (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      )}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              aria-label="Buscar solicitudes"
              maxLength={100}
              placeholder={"Buscar motivo, empleado o código"}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
            />
            <Selector
              etiqueta="Filtrar estado"
              valor={estado}
              opciones={[
                { value: "todos", label: "Todos los estados" },
                ...estadosAusencia,
              ]}
              onChange={(v) => {
                setEstado(
                  estadosAusencia.find((e) => e.value === v)?.value ?? "todos",
                );
                setPagina(1);
              }}
            />

            <Selector
              etiqueta="Filtrar empleado"
              valor={empleadoId}
              opciones={[
                { value: "todos", label: "Todos los empleados" },
                ...(empleados.data ?? []).map((e) => ({
                  value: String(e.id),
                  label: `${e.codigo} · ${e.nombre}`,
                })),
              ]}
              disabled={empleados.isPending || empleados.isError}
              onChange={(v) => {
                setEmpleado(v);
                setPagina(1);
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                id: "ausencia-desde",
                label: "Ausencia desde",
                value: desde,
                change: setDesde,
              },
              {
                id: "ausencia-hasta",
                label: "Ausencia hasta",
                value: hasta,
                change: setHasta,
              },
              {
                id: "ingresada-desde",
                label: "Solicitud ingresada desde",
                value: ingresadaDesde,
                change: setIngresadaDesde,
              },
              {
                id: "ingresada-hasta",
                label: "Solicitud ingresada hasta",
                value: ingresadaHasta,
                change: setIngresadaHasta,
              },
            ].map((filtro) => (
              <div key={filtro.id} className="min-w-0 space-y-2">
                <Label htmlFor={filtro.id}>{filtro.label}</Label>
                <Input
                  id={filtro.id}
                  type="date"
                  min="1900-01-01"
                  value={filtro.value}
                  onChange={(e) => {
                    filtro.change(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={limpiar}>
              Limpiar filtros
            </Button>
            <Button
              variant="outline"
              disabled={solicitudes.isFetching || !validado.success}
              onClick={() => void solicitudes.refetch()}
            >
              Actualizar listado
            </Button>
          </div>
          <ErrorAcceso
            mensaje={
              !validado.success
                ? validado.error.issues[0]?.message
                : (solicitudes.error?.message ??
                  empleados.error?.message ??
                  null)
            }
          />
          {empleados.isError && (
            <Button variant="outline" onClick={() => void empleados.refetch()}>
              Reintentar empleados
            </Button>
          )}
          {validado.success &&
            (solicitudes.isPending ? (
              <p role="status">Cargando solicitudes…</p>
            ) : (
              solicitudes.isSuccess && (
                <>
                  <AusenciasTable
                    filas={solicitudes.data.filas}
                    revision={true}
                    ambito={ambito}
                    puedeResolver={contexto.puedeResolver}
                    actualizando={solicitudes.isFetching}
                    onDetalle={(a) => setDetalle(a.id)}
                    onResolver={(a, accion) => {
                      setMensaje(null);
                    }}
                  />
                  <Paginacion
                    pagina={pagina}
                    total={solicitudes.data.total}
                    pendiente={solicitudes.isFetching}
                    onChange={setPagina}
                  />
                </>
              )
            ))}
        </CardContent>
      </Card>
      {detalle !== null && (
        <DetalleAusenciaModal
          id={detalle}
          ambito={ambito}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </>
  );
}
