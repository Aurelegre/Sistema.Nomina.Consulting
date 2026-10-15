"use client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type {
  ContextoNovedades,
  EmpleadoDepartamento,
  TipoNovedad,
} from "../Models/novedades.model";
import { etiquetasNovedad } from "../Helpers/novedades.helper";

export function EmpleadosDepartamentoTable({
  filas,
  contexto,
  abierto,
  onDetalle,
  onRegistro,
}: {
  filas: EmpleadoDepartamento[];
  contexto: ContextoNovedades;
  abierto: boolean;
  onDetalle: (id: number) => void;
  onRegistro: (empleado: EmpleadoDepartamento, tipo: TipoNovedad) => void;
}) {
  const columnas: TipoNovedad[] = [
    "HORAS_EXTRAS",
    "HORAS_DOBLES",
    ...(contexto.departamento.codigo === "PRODUCCION"
      ? ["PIEZAS" as const]
      : []),
    ...(contexto.departamento.codigo === "MERCADEO" ? ["VENTAS" as const] : []),
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Estado</TableHead>
          {columnas.map((tipo) => (
            <TableHead key={tipo}>{etiquetasNovedad[tipo]}</TableHead>
          ))}
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((empleado) => (
          <TableRow key={empleado.id}>
            <TableCell>
              <p className="font-medium">{empleado.nombre}</p>
              <p className="text-muted-foreground text-sm">{empleado.codigo}</p>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {empleado.estado === "ACTIVO" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            {columnas.map((tipo) => (
              <TableCell key={tipo}>
                {tipo === "VENTAS" ? "Q " : ""}
                {empleado.acumulados[tipo]}
              </TableCell>
            ))}
            <TableCell>
              <div className="flex flex-wrap gap-2">
                {contexto.puedeDetalle && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDetalle(empleado.id)}
                  >
                    Detalle
                  </Button>
                )}
                {contexto.tipos.map((tipo) => (
                  <Button
                    key={tipo}
                    variant="outline"
                    size="sm"
                    disabled={!abierto || empleado.estado !== "ACTIVO"}
                    onClick={() => onRegistro(empleado, tipo)}
                  >
                    Registrar {etiquetasNovedad[tipo].toLowerCase()}
                  </Button>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {!filas.length && (
          <TableRow>
            <TableCell colSpan={columnas.length + 3}>
              No hay empleados que coincidan con la búsqueda.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
