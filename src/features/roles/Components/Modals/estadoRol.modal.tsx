"use client";
import { ConfirmacionAcceso } from "~/components/acceso/ConfirmacionAcceso";
import { api } from "~/trpc/react";
import type { EstadoRolModalProps } from "../../Models/estadoRol.model";
export function EstadoRolModal({
  estadoRol,
  setEstadoRol,
  accion,
  actualizar,
}: EstadoRolModalProps) {
  const utils = api.useUtils();
  return (
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
  );
}
