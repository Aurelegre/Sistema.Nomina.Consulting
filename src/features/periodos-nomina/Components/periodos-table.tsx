"use client";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatFecha, formatPeriodo } from "../Helpers/periodos-nomina.helper";
import type { PeriodosTableProps } from "../Models/periodosTable.model";
export function PeriodosTable({ periodos }: PeriodosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Período</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creación</TableHead>
          <TableHead>Cierre</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periodos.map((periodo) => (
          <TableRow key={periodo.id}>
            <TableCell className="font-medium">
              {formatPeriodo(periodo.mes, periodo.anio)}
            </TableCell>
            <TableCell>
              <Badge
                variant={periodo.estado === "ABIERTO" ? "default" : "secondary"}
              >
                {periodo.estado}
              </Badge>
            </TableCell>
            <TableCell>{formatFecha(periodo.fechaCreacion)}</TableCell>
            <TableCell>{formatFecha(periodo.fechaCierre)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
