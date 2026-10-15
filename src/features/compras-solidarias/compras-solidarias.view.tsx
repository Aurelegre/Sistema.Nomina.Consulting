"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Selector } from "~/components/acceso/Selector";
import { Paginacion } from "~/components/acceso/Paginacion";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { EditorCompraModal } from "./Components/Modals/editorCompra.modal";
import { EliminarCompraModal } from "./Components/Modals/eliminarCompra.modal";
import { BuscarEmpleadoCompra } from "./Components/buscarEmpleadoCompra";
import { ComprasTable } from "./Components/compras-table";
import {
  nombrePeriodo,
  montoCompra,
} from "./Helpers/compras-solidarias.helper";
import type { Compra, EmpleadoCompra } from "./Models/compras-solidarias.model";

export function ComprasSolidariasView() {
  const contexto = api.comprasSolidarias.contexto.useQuery();
  // undefined sigue siempre al período activo; un ID representa consulta histórica explícita.
  const [periodoId, setPeriodoId] = useState<number>();
  const [empleado, setEmpleado] = useState<EmpleadoCompra>();
  const [buscarEmpleado, setBuscarEmpleado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<{ compra?: Compra } | null>(null);
  const [eliminar, setEliminar] = useState<Compra | null>(null);
  const [mensaje, setMensaje] = useState("");
  const consulta = api.comprasSolidarias.listar.useQuery({
    periodoId,
    empleadoId: empleado?.id,
    busqueda,
    pagina,
  });
  const permisos = contexto.data?.permisos ?? [];
  const seleccionado = consulta.data?.periodo;
  const abierto =
    seleccionado?.estado === "ABIERTO" &&
    seleccionado.id === contexto.data?.activo?.id;
  const opciones = [
    {
      value: "activo",
      label: contexto.data?.activo
        ? `Actual: ${nombrePeriodo(contexto.data.activo)}`
        : "Sin período abierto",
    },
    ...(contexto.data?.periodos ?? []).map((p) => ({
      value: String(p.id),
      label: nombrePeriodo(p),
    })),
  ];
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-muted-foreground">Asociación Solidarista</p>
        <h2 className="text-3xl font-semibold">Compras solidarias</h2>
        <p>
          Compras independientes que se suman para descontarse en la nómina del
          período.
        </p>
      </div>
      {contexto.isPending && <p role="status">Cargando períodos…</p>}
      {contexto.data && !contexto.data.activo && (
        <p role="status">
          No hay un período abierto. Puedes consultar compras de períodos
          anteriores.
        </p>
      )}
      {seleccionado?.estado === "CERRADO" && (
        <p role="status">
          Período cerrado: solo consulta. Selecciona el período abierto para
          crear compras.
        </p>
      )}
      {permisos.includes("ASSOCIATION.PURCHASES.CREATE") && (
        <Button
          disabled={!abierto || consulta.isFetching || contexto.isError}
          onClick={() => {
            setMensaje("");
            setEditor({});
          }}
        >
          Nueva compra
        </Button>
      )}
      {mensaje && <p role="status">{mensaje}</p>}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Período</Label>
              <Selector
                etiqueta="Período de compras"
                valor={periodoId ? String(periodoId) : "activo"}
                opciones={opciones}
                onChange={(s) => {
                  setPeriodoId(s === "activo" ? undefined : Number(s));
                  setPagina(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buscar-compra">Buscar por detalle</Label>
              <Input
                id="buscar-compra"
                value={busqueda}
                maxLength={150}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setBuscarEmpleado(true)}>
              Filtrar empleado
            </Button>
            <span>
              {empleado
                ? `${empleado.codigo} · ${empleado.nombre}`
                : "Todos los empleados"}
            </span>
            {empleado && (
              <Button
                variant="outline"
                onClick={() => {
                  setEmpleado(undefined);
                  setPagina(1);
                }}
              >
                Quitar filtro de empleado
              </Button>
            )}
          </div>
          <ErrorAcceso
            mensaje={consulta.error?.message ?? contexto.error?.message}
          />
          {(consulta.isError || contexto.isError) && (
            <Button
              onClick={() => {
                void consulta.refetch();
                void contexto.refetch();
              }}
            >
              Reintentar
            </Button>
          )}
          {consulta.isPending && <p role="status">Cargando compras…</p>}
          {consulta.data && !consulta.isError && !contexto.isError && (
            <>
              <p className="font-semibold">
                Total filtrado: {montoCompra(consulta.data.montoTotal)}
              </p>
              <ComprasTable
                filas={consulta.data.filas}
                abierto={abierto}
                periodo={seleccionado ? nombrePeriodo(seleccionado) : "—"}
                puedeEditar={permisos.includes("ASSOCIATION.PURCHASES.UPDATE")}
                puedeEliminar={permisos.includes(
                  "ASSOCIATION.PURCHASES.DELETE",
                )}
                onEditar={(c) => setEditor({ compra: c })}
                onEliminar={setEliminar}
              />
              <Paginacion
                pagina={pagina}
                total={consulta.data.total}
                pendiente={consulta.isFetching}
                onChange={setPagina}
              />
            </>
          )}
        </CardContent>
      </Card>
      {editor && (
        <EditorCompraModal
          compra={editor.compra}
          onCerrar={() => setEditor(null)}
          onGuardado={() => {
            setEditor(null);
            setPagina(1);
            setMensaje("Compra guardada correctamente.");
          }}
        />
      )}
      {eliminar && (
        <EliminarCompraModal
          compra={eliminar}
          onCerrar={() => setEliminar(null)}
          onEliminado={() => {
            setEliminar(null);
            setPagina(1);
            setMensaje("Compra eliminada correctamente.");
          }}
        />
      )}
      {buscarEmpleado && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setBuscarEmpleado(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtrar compras por empleado</DialogTitle>
              <DialogDescription>
                Incluye empleados con compras registradas, aunque estén
                inactivos.
              </DialogDescription>
            </DialogHeader>
            <BuscarEmpleadoCompra
              modo="filtrar"
              onSeleccionar={(e) => {
                setEmpleado(e);
                setPagina(1);
                setBuscarEmpleado(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
