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
import { MODULOS_PERMISOS } from "~/shared/modulos-permisos";
import type { PermisosTableProps } from "../Models/permisosTable.model";
export function PermisosTable({ filas, cargando }: PermisosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Permiso</TableHead>
          <TableHead>Módulo</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Roles asociados</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargando ? (
          <TableRow>
            <TableCell colSpan={4}>Cargando catálogo…</TableCell>
          </TableRow>
        ) : filas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4}>No se encontraron permisos.</TableCell>
          </TableRow>
        ) : (
          filas.map((permiso) => (
            <TableRow key={permiso.id}>
              <TableCell>
                <div className="font-medium">{permiso.nombre}</div>
                <div className="text-muted-foreground text-xs">
                  {permiso.codigo}
                </div>
              </TableCell>
              <TableCell>
                {MODULOS_PERMISOS[permiso.modulo] ?? permiso.modulo}
              </TableCell>
              <TableCell>{permiso.descripcion ?? permiso.nombre}</TableCell>
              <TableCell>
                <div className="flex max-w-lg flex-wrap gap-1">
                  {permiso.roles.length
                    ? permiso.roles.map((rol) => (
                        <Badge variant="secondary" key={rol.id}>
                          {rol.nombre}
                        </Badge>
                      ))
                    : "Sin asignaciones"}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
