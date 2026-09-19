"use client";
import { useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Paginacion } from "~/components/acceso/Paginacion";
import { Selector } from "~/components/acceso/Selector";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { EmpleadosTable } from "./Components/empleados-table";
import { EditorEmpleadoModal } from "./Components/Modals/editorEmpleado.modal";
import { ConfirmarEmpleadoModal } from "./Components/Modals/confirmarEmpleado.modal";
import { DetalleEmpleadoModal } from "./Components/Modals/detalleEmpleado.modal";
import type { Empleado, EmpleadosViewProps } from "./Models/empleados.model";
export function EmpleadosView({ identidad }: EmpleadosViewProps) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [departamento, setDepartamento] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<{ empleado?: Empleado } | null>(null);
  const [confirmacion, setConfirmacion] = useState<Empleado | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const rangoInvalido = !!(desde && hasta && desde > hasta);
  const departamentos = api.empleados.departamentos.useQuery();
  const empleados = api.empleados.listar.useQuery(
    {
      busqueda,
      pagina,
      tamano: 15,
      estado: estado === "ACTIVO" || estado === "INACTIVO" ? estado : undefined,
      departamentoId:
        departamento === "todos" ? undefined : Number(departamento),
      fechaIngresoDesde: desde ? new Date(`${desde}T00:00:00Z`) : undefined,
      fechaIngresoHasta: hasta ? new Date(`${hasta}T00:00:00Z`) : undefined,
    },
    { enabled: !rangoInvalido },
  );
  const puedeCrear = identidad.permisos.includes("EMPLOYEES.CREATE");
  const puedeEditar = identidad.permisos.includes("EMPLOYEES.UPDATE");
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Organización</p>
        <h2 className="text-3xl font-semibold tracking-tight">Empleados</h2>
        <p className="text-muted-foreground mt-2">
          Gestiona los datos personales, departamentos y salarios base de
          Consulting, S.A.
        </p>
      </div>
      {puedeCrear && (
        <Button
          onClick={() => {
            setMensaje(null);
            setEditor({});
          }}
        >
          Crear empleado
        </Button>
      )}
      {mensaje && (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      )}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              aria-label="Buscar empleados"
              placeholder="Buscar por nombre o código"
              maxLength={100}
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
                { value: "ACTIVO", label: "Activos" },
                { value: "INACTIVO", label: "Inactivos" },
              ]}
              onChange={(v) => {
                setEstado(v);
                setPagina(1);
              }}
            />
            <Selector
              etiqueta="Filtrar departamento"
              valor={departamento}
              disabled={departamentos.isPending || departamentos.isError}
              opciones={[
                { value: "todos", label: "Todos los departamentos" },
                ...(departamentos.data ?? []).map((d) => ({
                  value: String(d.id),
                  label: d.nombre,
                })),
              ]}
              onChange={(v) => {
                setDepartamento(v);
                setPagina(1);
              }}
            />
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ingreso-desde">Ingreso desde</Label>
              <Input
                id="ingreso-desde"
                type="date"
                min="1900-01-01"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingreso-hasta">Ingreso hasta</Label>
              <Input
                id="ingreso-hasta"
                type="date"
                min={desde || "1900-01-01"}
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setBusqueda("");
                setEstado("todos");
                setDepartamento("todos");
                setDesde("");
                setHasta("");
                setPagina(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
          <ErrorAcceso
            mensaje={
              rangoInvalido
                ? "La fecha inicial no puede ser posterior a la final."
                : (empleados.error?.message ?? departamentos.error?.message)
            }
          />
          {empleados.isError && (
            <Button variant="outline" onClick={() => void empleados.refetch()}>
              Reintentar
            </Button>
          )}
          {!rangoInvalido &&
            (empleados.isPending ? (
              <p role="status">Cargando empleados…</p>
            ) : (
              empleados.isSuccess && (
                <>
                  <EmpleadosTable
                    empleados={empleados.data.filas}
                    puedeEditar={puedeEditar}
                    actualizando={empleados.isFetching}
                    onDetalle={(e) => setDetalle(e.id)}
                    onEditar={(e) => {
                      setMensaje(null);
                      setEditor({ empleado: e });
                    }}
                    onEstado={(e) => {
                      setMensaje(null);
                      setConfirmacion(e);
                    }}
                  />
                  <Paginacion
                    pagina={pagina}
                    total={empleados.data.total}
                    pendiente={empleados.isFetching}
                    onChange={setPagina}
                  />
                </>
              )
            ))}
        </CardContent>
      </Card>
      {editor && (editor.empleado ? puedeEditar : puedeCrear) && (
        <EditorEmpleadoModal
          empleado={editor.empleado}
          onCerrar={() => setEditor(null)}
          onGuardado={() => {
            setEditor(null);
            setPagina(1);
            setMensaje("Empleado guardado correctamente.");
          }}
        />
      )}
      {confirmacion && puedeEditar && (
        <ConfirmarEmpleadoModal
          empleado={confirmacion}
          accion={confirmacion.estado === "ACTIVO" ? "baja" : "recontratar"}
          onCerrar={() => setConfirmacion(null)}
          onGuardado={() => {
            setConfirmacion(null);
            setPagina(1);
            setMensaje("Estado del empleado actualizado correctamente.");
          }}
        />
      )}
      {detalle !== null && (
        <DetalleEmpleadoModal id={detalle} onCerrar={() => setDetalle(null)} />
      )}
    </main>
  );
}
