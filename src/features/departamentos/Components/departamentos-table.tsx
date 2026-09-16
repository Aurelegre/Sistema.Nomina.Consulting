"use client";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { DepartamentosTableProps } from "../Models/departamentosTable.model";

export function DepartamentosTable({
  departamentos,
  puedeEditar,
  actualizando,
  onEditar,
}: DepartamentosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Departamento</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Cuenta contable</TableHead>
          {puedeEditar && (
            <TableHead className="text-right">Acciones</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!departamentos.length && (
          <TableRow>
            <TableCell colSpan={puedeEditar ? 4 : 3}>
              No se encontraron departamentos.
            </TableCell>
          </TableRow>
        )}
        {departamentos.map((departamento) => (
          <TableRow key={departamento.id}>
            <TableCell className="font-medium">{departamento.nombre}</TableCell>
            <TableCell>{departamento.codigo}</TableCell>
            <TableCell>
              {departamento.cuentaContable ?? (
                <Badge variant="outline">Pendiente de configurar</Badge>
              )}
            </TableCell>
            {puedeEditar && (
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actualizando}
                  onClick={() => onEditar(departamento)}
                >
                  Editar
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
