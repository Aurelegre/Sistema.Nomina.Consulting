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
  onDesactivar,
}: DepartamentosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Departamento</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Cuenta contable</TableHead>
          <TableHead>Estado</TableHead>
          {puedeEditar && (
            <TableHead className="text-right">Acciones</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!departamentos.length && (
          <TableRow>
            <TableCell colSpan={puedeEditar ? 5 : 4}>
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
            <TableCell>
              <Badge
                variant={
                  departamento.estado === "ACTIVO" ? "default" : "secondary"
                }
              >
                {departamento.estado === "ACTIVO" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            {puedeEditar && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actualizando}
                    onClick={() => onEditar(departamento)}
                  >
                    Editar
                  </Button>
                  {departamento.estado === "ACTIVO" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actualizando}
                      onClick={() => onDesactivar(departamento)}
                    >
                      Desactivar
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
