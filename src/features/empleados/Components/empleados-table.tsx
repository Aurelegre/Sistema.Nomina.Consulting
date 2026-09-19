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
import { fechaEmpleado, salarioEmpleado } from "../Helpers/empleados.helper";
import type { EmpleadosTableProps } from "../Models/empleados.model";
export function EmpleadosTable({
  empleados,
  puedeEditar,
  actualizando,
  onDetalle,
  onEditar,
  onEstado,
}: EmpleadosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Departamento</TableHead>
          <TableHead>Ingreso</TableHead>
          <TableHead>Salario base</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!empleados.length && (
          <TableRow>
            <TableCell colSpan={7}>No se encontraron empleados.</TableCell>
          </TableRow>
        )}
        {empleados.map((empleado) => (
          <TableRow key={empleado.id}>
            <TableCell>{empleado.codigo}</TableCell>
            <TableCell className="font-medium">{empleado.nombre}</TableCell>
            <TableCell>{empleado.departamento.nombre}</TableCell>
            <TableCell>{fechaEmpleado(empleado.fechaIngreso)}</TableCell>
            <TableCell className="whitespace-nowrap">
              {salarioEmpleado(empleado.salarioBase)}
            </TableCell>
            <TableCell>
              <Badge
                variant={empleado.estado === "ACTIVO" ? "default" : "secondary"}
              >
                {empleado.estado === "ACTIVO" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actualizando}
                  onClick={() => onDetalle(empleado)}
                >
                  Ver detalle
                </Button>
                {puedeEditar && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actualizando}
                      onClick={() => onEditar(empleado)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actualizando}
                      onClick={() => onEstado(empleado)}
                    >
                      {empleado.estado === "ACTIVO"
                        ? "Dar de baja"
                        : "Recontratar"}
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
