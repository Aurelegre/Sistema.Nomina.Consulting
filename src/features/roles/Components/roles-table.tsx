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
import type { RolesTableProps } from "../Models/rolesTable.model";
export function RolesTable({
  filas,
  cargando,
  pendiente,
  puedeGestionar,
  onEditar,
  onPermisos,
  onEstado,
}: RolesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rol</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Usuarios</TableHead>
          <TableHead>Permisos</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargando ? (
          <TableRow>
            <TableCell colSpan={6}>Cargando roles…</TableCell>
          </TableRow>
        ) : filas?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6}>No se encontraron roles.</TableCell>
          </TableRow>
        ) : (
          filas?.map((rol) => (
            <TableRow key={rol.id}>
              <TableCell>
                <div className="font-medium">{rol.nombre}</div>
                <div className="text-muted-foreground text-xs">
                  {rol.codigo}
                </div>
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                {rol.descripcion ?? "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={rol.estado === "ACTIVO" ? "default" : "secondary"}
                >
                  {rol.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>{rol.cantidadUsuarios}</TableCell>
              <TableCell>{rol.codigos.length}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {puedeGestionar && rol.administrable ? (
                    <>
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => onEditar(rol)}
                      >
                        Editar
                      </Button>
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => onPermisos(rol)}
                      >
                        Asignar permisos
                      </Button>
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => onEstado(rol)}
                      >
                        {rol.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">
                      {rol.codigo === "ADMINISTRADOR"
                        ? "Rol protegido"
                        : "Solo consulta"}
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
