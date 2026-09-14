"use client";
import { EstadoRolModal } from "./Components/Modals/estadoRol.modal";
import { RolesTable } from "./Components/roles-table";
import type { RolesViewProps } from "./Models/RolesViewProps.model";

import { ConfirmarPermisosRolModal } from "./Components/Modals/confirmarPermisosRol.modal";

import { PermisosRolModal } from "./Components/Modals/permisosRol.modal";

import { EditorRolModal } from "./Components/Modals/editorRol.modal";

import { useState } from "react";
import { EncabezadoAcceso } from "~/components/acceso/EncabezadoAcceso";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Paginacion } from "~/components/acceso/Paginacion";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import { api } from "~/trpc/react";

import type { Rol } from "./Models/Rol.model";
export function RolesView({ identidad }: RolesViewProps) {
  const utils = api.useUtils();
  const accion = useAccionAcceso();
  const puedeGestionar = identidad.permisos.includes("ROLES.MANAGE");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<Rol | "nuevo" | null>(null);
  const [rolPermisos, setRolPermisos] = useState<Rol | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [buscarPermiso, setBuscarPermiso] = useState("");
  const [estadoRol, setEstadoRol] = useState<Rol | null>(null);
  const [confirmarPermisos, setConfirmarPermisos] = useState(false);
  const roles = api.roles.listar.useQuery({ busqueda, pagina });
  const catalogo = api.roles.catalogoAsignable.useQuery(undefined, {
    enabled: puedeGestionar,
  });
  const agregados = seleccionados.filter(
    (codigo) => !rolPermisos?.codigos.includes(codigo),
  );
  const retirados = (rolPermisos?.codigos ?? []).filter(
    (codigo) => !seleccionados.includes(codigo),
  );
  const visibles = (catalogo.data ?? []).filter((p) =>
    `${p.codigo} ${p.nombre}`
      .toLocaleLowerCase()
      .includes(buscarPermiso.toLocaleLowerCase()),
  );
  const grupos = [...new Set(visibles.map((p) => p.modulo))];
  async function actualizar() {
    await Promise.all([
      utils.roles.listar.invalidate(),
      utils.usuarios.invalidate(),
      utils.permisos.invalidate(),
    ]);
  }
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <EncabezadoAcceso
        titulo="Roles"
        descripcion="Define las responsabilidades y los permisos de cada rol."
        identidad={identidad}
      >
        {puedeGestionar && (
          <Button
            onClick={() => {
              accion.setError(null);
              setEditor("nuevo");
            }}
          >
            Crear rol
          </Button>
        )}
      </EncabezadoAcceso>
      <ErrorAcceso
        mensaje={
          roles.error?.message ??
          (!editor && !rolPermisos && !estadoRol ? accion.error : null)
        }
      />
      {accion.mensaje && (
        <Alert>
          <AlertDescription>{accion.mensaje}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <Input
            aria-label="Buscar roles"
            placeholder="Buscar por nombre o código"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="max-w-md"
          />
          <RolesTable
            filas={roles.data?.filas}
            cargando={roles.isPending}
            pendiente={accion.pendiente || roles.isFetching}
            puedeGestionar={puedeGestionar}
            onEditar={(rol) => {
              accion.setError(null);
              setEditor(rol);
            }}
            onPermisos={(rol) => {
              accion.setError(null);
              setRolPermisos(rol);
              setSeleccionados(rol.codigos);
              setBuscarPermiso("");
            }}
            onEstado={(rol) => {
              accion.setError(null);
              setEstadoRol(rol);
            }}
          />
          <Paginacion
            pagina={pagina}
            total={roles.data?.total ?? 0}
            pendiente={roles.isFetching}
            onChange={setPagina}
          />
        </CardContent>
      </Card>

      <EditorRolModal
        editor={editor}
        setEditor={setEditor}
        accion={accion}
        actualizar={actualizar}
      />

      <PermisosRolModal
        rolPermisos={rolPermisos}
        setRolPermisos={setRolPermisos}
        accion={accion}
        confirmarPermisos={confirmarPermisos}
        setConfirmarPermisos={setConfirmarPermisos}
        buscarPermiso={buscarPermiso}
        setBuscarPermiso={setBuscarPermiso}
        seleccionados={seleccionados}
        setSeleccionados={setSeleccionados}
        agregados={agregados}
        retirados={retirados}
        visibles={visibles}
        grupos={grupos}
        errorCatalogo={catalogo.error?.message}
        cargandoCatalogo={catalogo.isPending}
      />
      <ConfirmarPermisosRolModal
        confirmarPermisos={confirmarPermisos}
        setConfirmarPermisos={setConfirmarPermisos}
        rolPermisos={rolPermisos}
        setRolPermisos={setRolPermisos}
        agregados={agregados}
        retirados={retirados}
        seleccionados={seleccionados}
        accion={accion}
        actualizar={actualizar}
      />
      <EstadoRolModal
        estadoRol={estadoRol}
        setEstadoRol={setEstadoRol}
        accion={accion}
        actualizar={actualizar}
      />
    </main>
  );
}
