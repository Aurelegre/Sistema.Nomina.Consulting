"use client";
import { ConfirmacionAcceso } from "~/components/acceso/ConfirmacionAcceso";
import { api } from "~/trpc/react";
import type { ConfirmarUsuarioModalProps } from "../../Models/confirmarUsuario.model";
export function ConfirmarUsuarioModal({
  confirmacion,
  setConfirmacion,
  accion,
  setCredencial,
  actualizar,
}: ConfirmarUsuarioModalProps) {
  const utils = api.useUtils();
  return (
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
  );
}
