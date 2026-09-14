"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { textoFormulario } from "~/shared/form-data";
import { MODULOS_PERMISOS } from "~/shared/modulos-permisos";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  EncabezadoAcceso,
  ErrorAcceso,
  Paginacion,
  ConfirmacionAcceso,
  useAccionAcceso,
  type Salidas,
  type Identidad,
} from "./common";
import { crearRolSchema } from "~/server/Rol/Models/crearRol.schema";
import { editarRolSchema } from "~/server/Rol/Models/editarRol.Schema";

type Rol = Salidas["roles"]["listar"]["filas"][number];
export function RolesManager({ identidad }: { identidad: Identidad }) {
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
              {roles.isPending ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando roles…</TableCell>
                </TableRow>
              ) : roles.data?.filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No se encontraron roles.</TableCell>
                </TableRow>
              ) : (
                roles.data?.filas.map((rol) => (
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
                        variant={
                          rol.estado === "ACTIVO" ? "default" : "secondary"
                        }
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
                              disabled={accion.pendiente || roles.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                accion.setError(null);
                                setEditor(rol);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              disabled={accion.pendiente || roles.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                accion.setError(null);
                                setRolPermisos(rol);
                                setSeleccionados(rol.codigos);
                                setBuscarPermiso("");
                              }}
                            >
                              Asignar permisos
                            </Button>
                            <Button
                              disabled={accion.pendiente || roles.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                accion.setError(null);
                                setEstadoRol(rol);
                              }}
                            >
                              {rol.estado === "ACTIVO"
                                ? "Desactivar"
                                : "Activar"}
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
          <Paginacion
            pagina={pagina}
            total={roles.data?.total ?? 0}
            pendiente={roles.isFetching}
            onChange={setPagina}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !accion.pendiente) setEditor(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor === "nuevo" ? "Crear rol" : "Editar rol"}
            </DialogTitle>
            <DialogDescription>
              El código identifica al rol y permanece fijo después de crearlo.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form
              key={editor === "nuevo" ? "nuevo" : editor.id}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const datos = new FormData(e.currentTarget);
                void accion.ejecutar(async () => {
                  const campos = {
                    nombre: textoFormulario(datos, "nombre"),
                    descripcion: textoFormulario(datos, "descripcion"),
                  };
                  if (editor === "nuevo") {
                    const validado = crearRolSchema.safeParse({
                      ...campos,
                      codigo: textoFormulario(datos, "codigo"),
                    });
                    if (!validado.success)
                      throw new Error(validado.error.issues[0]?.message);
                    await utils.client.roles.crear.mutate(validado.data);
                  } else {
                    const validado = editarRolSchema.safeParse({
                      ...campos,
                      id: editor.id,
                      version: editor.version,
                    });
                    if (!validado.success)
                      throw new Error(validado.error.issues[0]?.message);
                    await utils.client.roles.editar.mutate(validado.data);
                  }
                  setEditor(null);
                  accion.setMensaje("Rol guardado correctamente");
                  await actualizar();
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  required
                  maxLength={50}
                  readOnly={editor !== "nuevo"}
                  defaultValue={editor === "nuevo" ? "" : editor.codigo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  required
                  maxLength={100}
                  defaultValue={editor === "nuevo" ? "" : editor.nombre}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  name="descripcion"
                  maxLength={255}
                  defaultValue={
                    editor === "nuevo" ? "" : (editor.descripcion ?? "")
                  }
                />
              </div>
              <ErrorAcceso mensaje={accion.error} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={accion.pendiente}
                  onClick={() => setEditor(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={accion.pendiente}>
                  {accion.pendiente ? "Guardando…" : "Guardar rol"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rolPermisos}
        onOpenChange={(open) => {
          if (!open && !accion.pendiente && !confirmarPermisos)
            setRolPermisos(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Permisos de {rolPermisos?.nombre}</DialogTitle>
            <DialogDescription>
              Selecciona los permisos por módulo. Al guardar se cerrarán las
              sesiones de los usuarios de este rol.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Buscar permisos del rol"
            placeholder="Buscar nombre o código"
            value={buscarPermiso}
            onChange={(e) => setBuscarPermiso(e.target.value)}
          />
          <ErrorAcceso mensaje={catalogo.error?.message ?? accion.error} />
          {catalogo.isPending ? (
            <p>Cargando permisos…</p>
          ) : (
            <div className="max-h-[40vh] space-y-5 overflow-y-auto">
              {grupos.map((grupo) => (
                <fieldset key={grupo} className="space-y-3">
                  <legend className="mb-2 font-semibold">
                    {MODULOS_PERMISOS[grupo] ?? grupo}
                  </legend>
                  {visibles
                    .filter((p) => p.modulo === grupo)
                    .map((permiso) => (
                      <div
                        key={permiso.codigo}
                        className="flex items-start gap-3"
                      >
                        <Checkbox
                          id={`p-${permiso.id}`}
                          checked={seleccionados.includes(permiso.codigo)}
                          disabled={!permiso.asignable || accion.pendiente}
                          onCheckedChange={(checked) =>
                            setSeleccionados((actual) =>
                              checked
                                ? [...actual, permiso.codigo]
                                : actual.filter((c) => c !== permiso.codigo),
                            )
                          }
                        />
                        <Label
                          htmlFor={`p-${permiso.id}`}
                          className="grid gap-1 font-normal"
                        >
                          <span>{permiso.nombre}</span>
                          <span className="text-muted-foreground text-xs">
                            {permiso.codigo}
                            {!permiso.asignable ? " · Fuera de tu alcance" : ""}
                          </span>
                        </Label>
                      </div>
                    ))}
                </fieldset>
              ))}
              {!grupos.length && <p>No se encontraron permisos.</p>}
            </div>
          )}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  {seleccionados.length} seleccionados · {agregados.length} por
                  agregar · {retirados.length} por retirar
                </p>
                {agregados.length > 0 && (
                  <p className="text-xs break-words">
                    Agregar: {agregados.join(", ")}
                  </p>
                )}
                {retirados.length > 0 && (
                  <p className="text-xs break-words">
                    Retirar: {retirados.join(", ")}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={accion.pendiente}
              onClick={() => setRolPermisos(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                accion.pendiente ||
                catalogo.isPending ||
                !!catalogo.error ||
                (!agregados.length && !retirados.length)
              }
              onClick={() => {
                accion.setError(null);
                setConfirmarPermisos(true);
              }}
            >
              Guardar permisos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmacionAcceso
        abierto={confirmarPermisos}
        titulo="Confirmar permisos"
        descripcion={`Se agregarán ${agregados.length} y se retirarán ${retirados.length} permisos de ${rolPermisos?.nombre ?? "este rol"}. Sus usuarios deberán iniciar sesión nuevamente.`}
        pendiente={accion.pendiente}
        error={accion.error}
        onClose={() => setConfirmarPermisos(false)}
        onConfirm={() => {
          if (!rolPermisos) return;
          void accion.ejecutar(async () => {
            await utils.client.roles.guardarPermisos.mutate({
              id: rolPermisos.id,
              version: rolPermisos.version,
              codigos: seleccionados,
            });
            setConfirmarPermisos(false);
            setRolPermisos(null);
            accion.setMensaje("Permisos actualizados correctamente");
            await actualizar();
          });
        }}
      />
      <ConfirmacionAcceso
        abierto={!!estadoRol}
        titulo="Cambiar estado del rol"
        descripcion={
          estadoRol
            ? `${estadoRol.nombre} quedará ${estadoRol.estado === "ACTIVO" ? "inactivo" : "activo"}. Para desactivarlo no debe tener usuarios activos.`
            : ""
        }
        pendiente={accion.pendiente}
        error={accion.error}
        onClose={() => setEstadoRol(null)}
        onConfirm={() => {
          if (!estadoRol) return;
          void accion.ejecutar(async () => {
            await utils.client.roles.cambiarEstado.mutate({
              id: estadoRol.id,
              version: estadoRol.version,
              estado: estadoRol.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO",
            });
            setEstadoRol(null);
            accion.setMensaje("Estado del rol actualizado");
            await actualizar();
          });
        }}
      />
    </main>
  );
}
