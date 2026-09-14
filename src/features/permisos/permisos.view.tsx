"use client";
import { PermisosTable } from "./Components/permisos-table";
import { filtrarPermisos } from "./Helpers/permisos.helper";
import type { PermisosViewProps } from "./Models/PermisosViewProps.model";

import { useState } from "react";
import { EncabezadoAcceso } from "~/components/acceso/EncabezadoAcceso";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Selector } from "~/components/acceso/Selector";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { MODULOS_PERMISOS } from "~/shared/modulos-permisos";
import { api } from "~/trpc/react";

export function PermisosView({ identidad }: PermisosViewProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modulo, setModulo] = useState("todos");
  const permisos = api.permisos.listar.useQuery();
  const filas = filtrarPermisos(permisos.data ?? [], modulo, busqueda);
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
          <PermisosTable filas={filas} cargando={permisos.isPending} />
          <p className="text-muted-foreground text-sm">
            {filas.length} permisos
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
