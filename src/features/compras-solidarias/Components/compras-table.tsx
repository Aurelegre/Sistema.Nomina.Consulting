"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { fechaCompra, montoCompra } from "../Helpers/compras-solidarias.helper";
import type { Compra } from "../Models/compras-solidarias.model";
export function ComprasTable({
  filas,
  abierto,
  puedeEditar,
  puedeEliminar,
  periodo,
  onEditar,
  onEliminar,
}: {
  filas: Compra[];
  abierto: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  periodo: string;
  onEditar: (c: Compra) => void;
  onEliminar: (c: Compra) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            "Empleado",
            "Detalle",
            "Monto",
            "Período",
            "Registro",
            "Última edición",
            "Acciones",
          ].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <p>{c.empleado.nombre}</p>
              <p className="text-muted-foreground text-sm">
                {c.empleado.codigo}
              </p>
            </TableCell>
            <TableCell className="max-w-sm min-w-48 break-words whitespace-normal">
              {c.detalle}
            </TableCell>
            <TableCell>{montoCompra(c.monto)}</TableCell>
            <TableCell>{periodo}</TableCell>
            <TableCell>
              <p>{fechaCompra(c.fechaRegistro)}</p>
              <p>{c.usuarioRegistro.nombre}</p>
            </TableCell>
            <TableCell>
              {c.usuarioActualizacion ? (
                <>
                  <p>{fechaCompra(c.fechaActualizacion)}</p>
                  <p>{c.usuarioActualizacion.nombre}</p>
                </>
              ) : (
                "Sin ediciones"
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {puedeEditar && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!abierto}
                    onClick={() => onEditar(c)}
                  >
                    Editar
                  </Button>
                )}
                {puedeEliminar && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!abierto}
                    onClick={() => onEliminar(c)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {!filas.length && (
          <TableRow>
            <TableCell colSpan={7}>
              No hay compras para los filtros seleccionados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
