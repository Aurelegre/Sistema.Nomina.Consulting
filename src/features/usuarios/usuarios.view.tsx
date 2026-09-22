"use client";
import type { UsuariosViewProps } from "./Models/UsuariosViewProps.model";
import type { Confirmacion } from "./Models/confirmacion.model";
import type { Credencial } from "./Models/credencial.model";

import { CredencialUsuarioModal } from "./Components/Modals/credencialUsuario.modal";
import { UsuariosTable } from "./Components/usuarios-table";

import { ConfirmarUsuarioModal } from "./Components/Modals/confirmarUsuario.modal";

import { EditorUsuarioModal } from "./Components/Modals/editorUsuario.modal";
import { EditorEmpleadoUsuarioModal } from "./Components/Modals/editorEmpleadoUsuario.modal";

import { useState } from "react";
import { EncabezadoAcceso } from "~/components/acceso/EncabezadoAcceso";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Paginacion } from "~/components/acceso/Paginacion";
import { Selector } from "~/components/acceso/Selector";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useAccionAcceso } from "~/shared/Hooks/use-accion-acceso";
import { api } from "~/trpc/react";

import type { Editor } from "./Models/Editor.model";
import type { Usuario } from "./Models/Usuario.model";

export function UsuariosView({ identidad }: UsuariosViewProps) {
  const utils = api.useUtils();
  const accion = useAccionAcceso();
  const puede = (permiso: string) => identidad.permisos.includes(permiso);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState("todos");
  const [rolFiltro, setRolFiltro] = useState("todos");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [usuarioAsignacion, setUsuarioAsignacion] = useState<Usuario | null>(
    null,
  );
  const [rolElegido, setRolElegido] = useState("");
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [credencial, setCredencial] = useState<Credencial | null>(null);
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
          <UsuariosTable
            filas={usuarios.data?.filas}
            cargando={usuarios.isPending}
            pendiente={accion.pendiente || usuarios.isFetching}
            identidad={identidad}
            puede={puede}
            abrirEditor={abrirEditor}
            asignarEmpleado={setUsuarioAsignacion}
            confirmar={confirmar}
          />
          <Paginacion
            pagina={pagina}
            total={usuarios.data?.total ?? 0}
            pendiente={usuarios.isFetching}
            onChange={setPagina}
          />
        </CardContent>
      </Card>

      {editor && (
        <EditorUsuarioModal
          editor={editor}
          setEditor={setEditor}
          accion={accion}
          rolElegido={rolElegido}
          setRolElegido={setRolElegido}
          opcionesRoles={opcionesRoles}
          errorAsignables={asignables.error?.message}
          cargandoAsignables={asignables.isPending}
          identidad={identidad}
          setCredencial={setCredencial}
          actualizar={actualizar}
        />
      )}

      {usuarioAsignacion && (
        <EditorEmpleadoUsuarioModal
          usuario={usuarioAsignacion}
          onCerrar={() => setUsuarioAsignacion(null)}
          onAsignado={() => {
            setUsuarioAsignacion(null);
            accion.setMensaje("Empleado asignado correctamente");
          }}
        />
      )}

      <ConfirmarUsuarioModal
        confirmacion={confirmacion}
        setConfirmacion={setConfirmacion}
        accion={accion}
        setCredencial={setCredencial}
        actualizar={actualizar}
      />

      <CredencialUsuarioModal
        credencial={credencial}
        cerrarCredencial={cerrarCredencial}
        copiado={copiado}
        setCopiado={setCopiado}
        accion={accion}
      />
    </main>
  );
}
