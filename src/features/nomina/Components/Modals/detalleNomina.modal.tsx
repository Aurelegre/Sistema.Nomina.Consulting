"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { dinero, fechaTexto, periodoTexto } from "../../Helpers/nomina.helper";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
type RouterOutputs = inferRouterOutputs<AppRouter>;

type Fila = RouterOutputs["nomina"]["detalle"]["filas"][number];
type CampoImporte = {
  [K in keyof Fila]: Fila[K] extends string ? K : never;
}[keyof Fila];
const importes: [CampoImporte, string][] = [
  ["salarioBase", "Salario base"],
  ["salarioDevengado", "Salario devengado"],
  [
    "descuentoAusencias",
    "Reducción por ausencias (ya incluida en salario devengado)",
  ],
  ["montoExtras", "Horas extras"],
  ["montoDobles", "Horas dobles"],
  ["produccion", "Producción"],
  ["comision", "Comisiones"],
  ["bonificacion", "Bonificación incentivo"],
  ["totalIngresos", "Total ingresos"],
  ["baseIgss", "Base IGSS"],
  ["igssLaboral", "IGSS laboral"],
  ["isr", "ISR"],
  ["solidaridad", "Ahorro solidarista"],
  ["compras", "Compras solidarias"],
  ["totalEgresos", "Total deducciones"],
  ["liquido", "Salario líquido"],
  ["anticipo", "Anticipo entregado"],
  ["pagoFinal", "Pago final"],
  ["igssPatronal", "IGSS patronal (a cargo de la empresa)"],
  ["rentaAnual", "Renta imponible anual de referencia ISR"],
];
export function DetalleNominaModal({
  id,
  propia,
  cerrar,
}: {
  id: number;
  propia: boolean;
  cerrar: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const admin = api.nomina.detalle.useQuery(
    { id, pagina },
    { enabled: !propia },
  );
  const personal = api.nomina.miDetalle.useQuery(
    { id, pagina },
    { enabled: propia },
  );
  const consulta = propia ? personal : admin;
  const [empleado, setEmpleado] = useState<number | null>(null);
  const fila =
    consulta.data?.filas.find((f) => f.id === empleado) ??
    consulta.data?.filas[0];
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) cerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalle de nómina</DialogTitle>
          <DialogDescription>
            {consulta.data
              ? `${periodoTexto(consulta.data.nomina.periodo)} · Generada en ${consulta.data.nomina.mesGeneracion} · ${fechaTexto(consulta.data.nomina.fechaFin)} · Por ${consulta.data.nomina.solicitante}`
              : "Consulta del desglose histórico."}
          </DialogDescription>
        </DialogHeader>
        {consulta.isPending && <p>Cargando detalle…</p>}
        {consulta.error && <p role="alert">{consulta.error.message}</p>}
        {!propia && consulta.data && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Pago final</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consulta.data.filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      {f.codigo} · {f.nombre}
                    </TableCell>
                    <TableCell>{dinero(f.pagoFinal)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => setEmpleado(f.id)}
                      >
                        Ver desglose
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button
                disabled={pagina === 1}
                onClick={() => {
                  setPagina(pagina - 1);
                  setEmpleado(null);
                }}
              >
                Anterior
              </Button>
              <span>Página {pagina}</span>
              <Button
                disabled={pagina * 15 >= consulta.data.total}
                onClick={() => {
                  setPagina(pagina + 1);
                  setEmpleado(null);
                }}
              >
                Siguiente
              </Button>
            </div>
          </>
        )}
        {fila && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">
              {fila.nombre} · {fila.departamento}
            </h3>
            <p>
              Días laborados: {fila.diasLaborados} · Ausencias:{" "}
              {fila.diasAusencia} · Horas extras: {fila.horasExtras} · Horas
              dobles: {fila.horasDobles}
            </p>
            <p>
              Piezas: {fila.piezas} · Ventas: {dinero(fila.ventas)} · Comisión:{" "}
              {(Number(fila.tasaComision) * 100).toFixed(2)}%
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importes.map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right">
                      {dinero(fila[key])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {Number(fila.pagoFinal) < 0 && (
              <p role="status">
                El resultado del período es negativo. No se trasladará
                automáticamente a otro período.
              </p>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
