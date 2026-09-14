"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { textoFormulario } from "~/shared/form-data";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  Selector,
  Paginacion,
  ConfirmacionAcceso,
  useAccionAcceso,
  type Salidas,
  type Identidad,
} from "./common";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
} from "~/server/Usuarios/Models/usuarios.schema";

type Usuario = Salidas["usuarios"]["listar"]["filas"][number];
type Editor = { tipo: "crear" } | { tipo: "editar" | "rol"; usuario: Usuario };

export function UsuariosManager({ identidad }: { identidad: Identidad }) {
  const utils = api.useUtils();
  const accion = useAccionAcceso();
  const puede = (permiso: string) => identidad.permisos.includes(permiso);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState("todos");
  const [rolFiltro, setRolFiltro] = useState("todos");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rolElegido, setRolElegido] = useState("");
  const [confirmacion, setConfirmacion] = useState<{
    tipo: "estado" | "password";
    usuario: Usuario;
  } | null>(null);
  const [credencial, setCredencial] = useState<{
    username: string;
    passwordTemporal: string;
    propiaCuenta?: boolean;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const usuarios = api.usuarios.listar.useQuery({
    busqueda,
    pagina,
    estado: estado === "ACTIVO" || estado === "INACTIVO" ? estado : undefined,
    rolId: rolFiltro === "todos" ? undefined : Number(rolFiltro),
  });
  const filtros = api.usuarios.rolesFiltro.useQuery();
  const asignables = api.usuarios.rolesAsignables.useQuery(undefined, {
    enabled: puede("USERS.ASSIGN_ROLE"),
  });
  const opcionesRoles = [
    { value: "", label: "Selecciona un rol" },
    ...(asignables.data ?? []).map((rol) => ({
      value: String(rol.id),
      label: rol.nombre,
    })),
  ];
  async function actualizar() {
    await Promise.all([
      utils.usuarios.listar.invalidate(),
      utils.roles.listar.invalidate(),
    ]);
  }
  function abrirEditor(nuevo: Editor) {
    accion.setError(null);
    setRolElegido(nuevo.tipo === "rol" ? String(nuevo.usuario.rolId) : "");
    setEditor(nuevo);
  }
  function confirmar(tipo: "estado" | "password", usuario: Usuario) {
    accion.setError(null);
    setConfirmacion({ tipo, usuario });
  }
  const cerrarCredencial = () => {
    const propia = credencial?.propiaCuenta;
    setCredencial(null);
    setCopiado(false);
    if (propia) window.location.assign("/login");
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <EncabezadoAcceso
        titulo="Usuarios"
        descripcion="Administra cuentas, roles y acceso al sistema de nómina."
        identidad={identidad}
      >
        {puede("USERS.CREATE") && puede("USERS.ASSIGN_ROLE") && (
          <Button onClick={() => abrirEditor({ tipo: "crear" })}>
            Crear usuario
          </Button>
        )}
      </EncabezadoAcceso>
      <ErrorAcceso
        mensaje={
          usuarios.error?.message ??
          filtros.error?.message ??
          (!editor && !confirmacion ? accion.error : null)
        }
      />
      {accion.mensaje && (
        <Alert>
          <AlertDescription>{accion.mensaje}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              aria-label="Buscar usuarios"
              placeholder="Buscar por nombre o usuario"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
            />
            <Selector
              etiqueta="Filtrar estado"
              valor={estado}
              opciones={[
                { value: "todos", label: "Todos los estados" },
                { value: "ACTIVO", label: "Activos" },
                { value: "INACTIVO", label: "Inactivos" },
              ]}
              onChange={(v) => {
                setEstado(v);
                setPagina(1);
              }}
            />
            <Selector
              etiqueta="Filtrar rol"
              valor={rolFiltro}
              opciones={[
                { value: "todos", label: "Todos los roles" },
                ...(filtros.data ?? []).map((r) => ({
                  value: String(r.id),
                  label: r.nombre,
                })),
              ]}
              onChange={(v) => {
                setRolFiltro(v);
                setPagina(1);
              }}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contraseña</TableHead>
                <TableHead>Creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.isPending ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando usuarios…</TableCell>
                </TableRow>
              ) : usuarios.data?.filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No se encontraron usuarios.</TableCell>
                </TableRow>
              ) : (
                usuarios.data?.filas.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="font-medium">{usuario.nombre}</div>
                      <div className="text-muted-foreground text-xs">
                        {usuario.username}
                        {usuario.id === identidad.id ? " · Tu cuenta" : ""}
                      </div>
                    </TableCell>
                    <TableCell>{usuario.rol.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          usuario.estado === "ACTIVO" ? "default" : "secondary"
                        }
                      >
                        {usuario.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.debeCambiarPassword ? (
                        <Badge variant="outline">Cambio pendiente</Badge>
                      ) : (
                        "Actualizada"
                      )}
                    </TableCell>
                    <TableCell>
                      {usuario.fechaCreacion.toLocaleDateString("es-GT")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {usuario.administrable && puede("USERS.UPDATE") && (
                          <Button
                            disabled={accion.pendiente || usuarios.isFetching}
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              abrirEditor({ tipo: "editar", usuario })
                            }
                          >
                            Editar
                          </Button>
                        )}
                        {usuario.administrable &&
                          usuario.id !== identidad.id &&
                          puede("USERS.ASSIGN_ROLE") && (
                            <Button
                              disabled={accion.pendiente || usuarios.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                abrirEditor({ tipo: "rol", usuario })
                              }
                            >
                              Cambiar rol
                            </Button>
                          )}
                        {usuario.administrable &&
                          usuario.id !== identidad.id &&
                          puede("USERS.DISABLE") && (
                            <Button
                              disabled={accion.pendiente || usuarios.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() => confirmar("estado", usuario)}
                            >
                              {usuario.estado === "ACTIVO"
                                ? "Desactivar"
                                : "Activar"}
                            </Button>
                          )}
                        {usuario.administrable &&
                          puede("USERS.RESET_PASSWORD") && (
                            <Button
                              disabled={accion.pendiente || usuarios.isFetching}
                              size="sm"
                              variant="outline"
                              onClick={() => confirmar("password", usuario)}
                            >
                              Restablecer contraseña
                            </Button>
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
            total={usuarios.data?.total ?? 0}
            pendiente={usuarios.isFetching}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.tipo === "crear"
                ? "Crear usuario"
                : editor?.tipo === "rol"
                  ? "Cambiar rol"
                  : "Editar usuario"}
            </DialogTitle>
            <DialogDescription>
              {editor?.tipo === "crear"
                ? "Se generará una contraseña temporal y el usuario deberá cambiarla al ingresar."
                : "Los cambios de usuario o rol cierran las sesiones de la cuenta afectada."}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form
              key={
                editor.tipo === "crear"
                  ? "nuevo"
                  : `${editor.tipo}-${editor.usuario.id}`
              }
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const datos = new FormData(e.currentTarget);
                void accion.ejecutar(async () => {
                  if (editor.tipo === "rol") {
                    await utils.client.usuarios.asignarRol.mutate({
                      id: editor.usuario.id,
                      version: editor.usuario.version,
                      rolId: Number(rolElegido),
                    });
                  } else {
                    const campos = {
                      username: textoFormulario(datos, "username"),
                      nombre: textoFormulario(datos, "nombre"),
                    };
                    if (editor.tipo === "crear") {
                      const validado = crearUsuarioSchema.safeParse({
                        ...campos,
                        rolId: Number(rolElegido),
                      });
                      if (!validado.success)
                        throw new Error(validado.error.issues[0]?.message);
                      const resultado =
                        await utils.client.usuarios.crear.mutate(validado.data);
                      setCredencial({
                        username: resultado.usuario.username,
                        passwordTemporal: resultado.passwordTemporal,
                      });
                    } else {
                      const validado = editarUsuarioSchema.safeParse({
                        ...campos,
                        id: editor.usuario.id,
                        version: editor.usuario.version,
                      });
                      if (!validado.success)
                        throw new Error(validado.error.issues[0]?.message);
                      await utils.client.usuarios.editar.mutate(validado.data);
                      if (
                        editor.usuario.id === identidad.id &&
                        editor.usuario.username !== validado.data.username
                      ) {
                        window.location.assign("/login");
                        return;
                      }
                    }
                  }
                  setEditor(null);
                  accion.setMensaje("Usuario guardado correctamente");
                  await actualizar();
                });
              }}
            >
              {editor.tipo !== "rol" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      required
                      maxLength={150}
                      defaultValue={
                        editor.tipo === "editar" ? editor.usuario.nombre : ""
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario</Label>
                    <Input
                      id="username"
                      name="username"
                      required
                      minLength={3}
                      maxLength={100}
                      autoComplete="off"
                      defaultValue={
                        editor.tipo === "editar" ? editor.usuario.username : ""
                      }
                    />
                  </div>
                </>
              )}
              {editor.tipo !== "editar" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rol</p>
                  <Selector
                    etiqueta="Rol del usuario"
                    valor={rolElegido}
                    opciones={opcionesRoles}
                    onChange={setRolElegido}
                  />
                  <ErrorAcceso mensaje={asignables.error?.message} />
                </div>
              )}
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
                <Button
                  type="submit"
                  disabled={
                    accion.pendiente ||
                    (editor.tipo !== "editar" &&
                      (!rolElegido || asignables.isPending))
                  }
                >
                  {accion.pendiente ? "Guardando…" : "Guardar usuario"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmacionAcceso
        abierto={!!confirmacion}
        titulo={
          confirmacion?.tipo === "password"
            ? "Restablecer contraseña"
            : "Cambiar estado del usuario"
        }
        descripcion={
          confirmacion
            ? `Cuenta: ${confirmacion.usuario.username}. ${confirmacion.tipo === "password" ? "Se generará una contraseña temporal y se cerrarán todas sus sesiones." : `El usuario quedará ${confirmacion.usuario.estado === "ACTIVO" ? "inactivo" : "activo"}. Se cerrarán sus sesiones actuales.`}`
            : ""
        }
        pendiente={accion.pendiente}
        error={accion.error}
        onClose={() => setConfirmacion(null)}
        onConfirm={() => {
          if (!confirmacion) return;
          void accion.ejecutar(async () => {
            const { usuario, tipo } = confirmacion;
            if (tipo === "password") {
              const resultado =
                await utils.client.usuarios.restablecerPassword.mutate({
                  id: usuario.id,
                  version: usuario.version,
                });
              setCredencial(resultado);
              setConfirmacion(null);
              if (resultado.propiaCuenta) return;
            } else {
              await utils.client.usuarios.cambiarEstado.mutate({
                id: usuario.id,
                version: usuario.version,
                estado: usuario.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO",
              });
              setConfirmacion(null);
            }
            accion.setMensaje("Cambio aplicado correctamente");
            await actualizar();
          });
        }}
      />

      <Dialog
        open={!!credencial}
        onOpenChange={(open) => {
          if (!open) cerrarCredencial();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Copia esta contraseña y entrégala al usuario. Al cerrar este
              diálogo no volverá a mostrarse.
            </DialogDescription>
          </DialogHeader>
          {credencial && (
            <>
              <p>
                Usuario: <strong>{credencial.username}</strong>
              </p>
              <Input
                aria-label="Contraseña temporal generada"
                readOnly
                value={credencial.passwordTemporal}
              />
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        credencial.passwordTemporal,
                      );
                      setCopiado(true);
                    } catch {
                      accion.setError(
                        "No se pudo copiar. Selecciona y copia la contraseña manualmente.",
                      );
                    }
                  }}
                >
                  {copiado ? "Copiada" : "Copiar contraseña"}
                </Button>
                <Button variant="outline" onClick={cerrarCredencial}>
                  {credencial.propiaCuenta ? "Ir al login" : "Cerrar"}
                </Button>
              </div>
              <ErrorAcceso mensaje={accion.error} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
