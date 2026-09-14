"use client";
import { ConfirmacionAcceso } from "~/components/acceso/ConfirmacionAcceso";
import { api } from "~/trpc/react";
import type { ConfirmarPermisosRolModalProps } from "../../Models/confirmarPermisosRol.model";
export function ConfirmarPermisosRolModal({
  confirmarPermisos,
  setConfirmarPermisos,
  rolPermisos,
  setRolPermisos,
  agregados,
  retirados,
  seleccionados,
  accion,
  actualizar,
}: ConfirmarPermisosRolModalProps) {
  const utils = api.useUtils();
  return (
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
  );
}
