"use client";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import type { AusenciasTableProps } from "../Models/ausencias.model";
import {
  cuentaSalario,
  fechaAusencia,
  fechaRegistro,
} from "../Helpers/ausencias.helper";
import { EstadoAusenciaBadge } from "./estado-ausencia-badge";
export function AusenciasTable({
  filas,
  revision,
  ambito,
  puedeResolver,
  actualizando,
  onDetalle,
  onResolver,
}: AusenciasTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitud</TableHead>
          {revision && <TableHead>Empleado</TableHead>}
          <TableHead>Fechas de ausencia</TableHead>
          <TableHead>Ingresada</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>A cuenta de salario</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!filas.length && (
          <TableRow>
            <TableCell colSpan={revision ? 7 : 6}>
              No se encontraron solicitudes con estos filtros.
            </TableCell>
          </TableRow>
        )}
        {filas.map((ausencia) => (
          <TableRow key={ausencia.id}>
            <TableCell>
              <p className="font-medium">#{ausencia.id}</p>
              <p
                className="text-muted-foreground max-w-48 truncate"
                title={ausencia.motivo}
              >
                {ausencia.motivo}
              </p>
            </TableCell>
            {revision && (
              <TableCell>
                <p>{ausencia.empleado.nombre}</p>
                <p className="text-muted-foreground text-xs">
                  {ausencia.empleado.codigo}
                </p>
              </TableCell>
            )}
            <TableCell>
              {fechaAusencia(ausencia.fechaInicio)} —{" "}
              {fechaAusencia(ausencia.fechaFin)}
            </TableCell>
            <TableCell>{fechaRegistro(ausencia.fechaCreacion)}</TableCell>
            <TableCell>
              <EstadoAusenciaBadge estado={ausencia.estado} />
            </TableCell>
            <TableCell>{cuentaSalario(ausencia)}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actualizando}
                  onClick={() => onDetalle(ausencia)}
                >
                  Ver detalle
                </Button>
                {revision &&
                  puedeResolver &&
                  ausencia.estado === "PENDIENTE" &&
                  ambito === "departamento" && (
                    <>
                      <Button
                        size="sm"
                        disabled={actualizando}
                        onClick={() => onResolver(ausencia, "aprobar")}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actualizando}
                        onClick={() => onResolver(ausencia, "rechazar")}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
