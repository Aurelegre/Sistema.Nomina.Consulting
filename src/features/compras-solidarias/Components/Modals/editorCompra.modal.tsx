"use client";
import { useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { BuscarEmpleadoCompra } from "../buscarEmpleadoCompra";
import { nombrePeriodo } from "../../Helpers/compras-solidarias.helper";
import type {
  Compra,
  ContextoCompras,
  EmpleadoCompra,
} from "../../Models/compras-solidarias.model";

type Props = {
  empleado?: EmpleadoCompra;
  compra?: Compra;
  onCerrar: () => void;
  onGuardado: () => void;
};
export function EditorCompraModal(props: Props) {
  const contexto = api.comprasSolidarias.contexto.useQuery();
  const [guardando, setGuardando] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !guardando) props.onCerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.compra ? "Editar compra solidaria" : "Tienda Solidaria"}
          </DialogTitle>
          <DialogDescription>
            {props.compra
              ? "Modifica el monto y el detalle. El empleado y el período se conservan."
              : "Registra una compra para su descuento íntegro en la nómina del período abierto."}
          </DialogDescription>
        </DialogHeader>
        {contexto.isPending && <p role="status">Consultando período…</p>}
        <ErrorAcceso mensaje={contexto.error?.message} />
        {contexto.isError && (
          <Button variant="outline" onClick={() => void contexto.refetch()}>
            Reintentar
          </Button>
        )}
        {contexto.data && !contexto.isError && (
          <FormularioCompra
            {...props}
            contexto={contexto.data}
            onPendiente={setGuardando}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function FormularioCompra({
  empleado: inicial,
  compra,
  contexto,
  onCerrar,
  onGuardado,
  onPendiente,
}: Props & { contexto: ContextoCompras; onPendiente: (b: boolean) => void }) {
  const [empleado, setEmpleado] = useState<EmpleadoCompra | undefined>(
    compra?.empleado ?? inicial,
  );
  // Conservar el período mostrado al abrir: nunca trasladar silenciosamente una compra.
  const [periodo] = useState(() =>
    compra
      ? contexto.periodos.find((p) => p.id === compra.periodoId)
      : contexto.activo,
  );
  const [monto, setMonto] = useState(compra?.monto ?? "");
  const [detalle, setDetalle] = useState(compra?.detalle ?? "");
  const enviando = useRef(false);
  const utils = api.useUtils();
  const opciones = {
    onSuccess: () => {
      void utils.comprasSolidarias.invalidate();
      onGuardado();
    },
    onSettled: () => {
      enviando.current = false;
      onPendiente(false);
    },
  };
  const crear = api.comprasSolidarias.crear.useMutation(opciones);
  const editar = api.comprasSolidarias.editar.useMutation(opciones);
  const pendiente = crear.isPending || editar.isPending;
  if (periodo?.estado !== "ABIERTO")
    return (
      <>
        <p role="status">
          {compra
            ? "El período de esta compra está cerrado. Solo se permite consultar."
            : "No hay un período abierto para registrar compras."}
        </p>
        <Button variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
      </>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (enviando.current || !empleado) return;
        enviando.current = true;
        onPendiente(true);
        if (compra)
          editar.mutate({
            id: compra.id,
            version: compra.version,
            monto,
            detalle,
          });
        else
          crear.mutate({
            empleadoId: empleado.id,
            periodoId: periodo.id,
            monto,
            detalle,
          });
      }}
    >
      <p>
        Período: <strong>{nombrePeriodo(periodo)}</strong>
      </p>
      {empleado ? (
        <div>
          <p>
            Empleado:{" "}
            <strong>
              {empleado.codigo} · {empleado.nombre}
            </strong>
          </p>
          {!compra && !inicial && (
            <Button
              type="button"
              variant="outline"
              disabled={pendiente}
              onClick={() => setEmpleado(undefined)}
            >
              Cambiar empleado
            </Button>
          )}
        </div>
      ) : (
        <BuscarEmpleadoCompra modo="crear" onSeleccionar={setEmpleado} />
      )}
      <div className="space-y-2">
        <Label htmlFor="monto-compra">Monto (Q)</Label>
        <Input
          id="monto-compra"
          type="number"
          min="0.01"
          max="9999999999.99"
          step="0.01"
          required
          disabled={pendiente}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="detalle-compra">Detalle de la compra</Label>
        <Textarea
          id="detalle-compra"
          required
          maxLength={500}
          disabled={pendiente}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
      </div>
      <ErrorAcceso mensaje={crear.error?.message ?? editar.error?.message} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pendiente}
          onClick={onCerrar}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pendiente || !empleado || !detalle.trim()}
        >
          {pendiente ? "Guardando…" : "Guardar compra"}
        </Button>
      </div>
    </form>
  );
}
