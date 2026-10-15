"use client";
import { useState } from "react";
import { EditorEmpleadoUsuarioModal } from "./editorEmpleadoUsuario.modal";
import type { EmpleadoAsignable } from "../../Models/editorEmpleadoUsuario.model";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Selector } from "~/components/acceso/Selector";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
} from "~/server/Usuarios/Models/usuarios.schema";
import { textoFormulario } from "~/shared/form-data";
import { api } from "~/trpc/react";
import type { EditorUsuarioModalProps } from "../../Models/editorUsuario.model";
export function EditorUsuarioModal({
  editor,
  setEditor,
  accion,
  rolElegido,
  setRolElegido,
  opcionesRoles,
  errorAsignables,
  cargandoAsignables,
  identidad,
  setCredencial,
  actualizar,
}: EditorUsuarioModalProps) {
  const utils = api.useUtils();
  const [empleado, setEmpleado] = useState<EmpleadoAsignable | null>(null);
  const [seleccionando, setSeleccionando] = useState(false);
  return (
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
                      empleadoId: empleado?.id,
                    });
                    if (!validado.success)
                      throw new Error(validado.error.issues[0]?.message);
                    const resultado = await utils.client.usuarios.crear.mutate(
                      validado.data,
                    );
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
                <ErrorAcceso mensaje={errorAsignables} />
              </div>
            )}
            {editor.tipo === "crear" &&
              identidad.permisos.includes("USERS.ASSIGN_EMPLOYEE") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Empleado (opcional)</p>
                  <p className="text-muted-foreground text-sm">
                    {empleado
                      ? `${empleado.codigo} · ${empleado.nombre} · ${empleado.departamento.nombre}`
                      : "Sin empleado asignado"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={accion.pendiente}
                      onClick={() => setSeleccionando(true)}
                    >
                      {empleado ? "Cambiar empleado" : "Asignar empleado"}
                    </Button>
                    {empleado && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={accion.pendiente}
                        onClick={() => setEmpleado(null)}
                      >
                        Quitar selección
                      </Button>
                    )}
                  </div>
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
                    (!rolElegido || cargandoAsignables))
                }
              >
                {accion.pendiente ? "Guardando…" : "Guardar usuario"}
              </Button>
            </div>
          </form>
        )}
        {seleccionando && (
          <EditorEmpleadoUsuarioModal
            onCerrar={() => setSeleccionando(false)}
            onAsignado={(seleccion) => {
              setEmpleado(seleccion);
              setSeleccionando(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
