"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { MODULOS_PERMISOS } from "~/shared/modulos-permisos";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  EncabezadoAcceso,
  ErrorAcceso,
  Selector,
  type Identidad,
} from "./common";

export function PermisosManager({ identidad }: { identidad: Identidad }) {
  const [busqueda, setBusqueda] = useState("");
  const [modulo, setModulo] = useState("todos");
  const permisos = api.permisos.listar.useQuery();
  const filas = (permisos.data ?? []).filter(
    (p) =>
      (modulo === "todos" || p.modulo === modulo) &&
      `${p.nombre} ${p.codigo} ${p.descripcion ?? ""}`
        .toLocaleLowerCase()
        .includes(busqueda.toLocaleLowerCase()),
  );
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <EncabezadoAcceso
        titulo="Permisos"
        descripcion="Consulta las acciones disponibles y los roles que tienen acceso a ellas. Las asignaciones se administran desde Roles."
        identidad={identidad}
      />
      <ErrorAcceso mensaje={permisos.error?.message} />
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label="Buscar permisos"
              placeholder="Buscar nombre o código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Selector
              etiqueta="Filtrar módulo"
              valor={modulo}
              opciones={[
                { value: "todos", label: "Todos los módulos" },
                ...Object.entries(MODULOS_PERMISOS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              onChange={setModulo}
            />
          </div>
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
              {permisos.isPending ? (
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
                    <TableCell>
                      {permiso.descripcion ?? permiso.nombre}
                    </TableCell>
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
          <p className="text-muted-foreground text-sm">
            {filas.length} permisos
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
