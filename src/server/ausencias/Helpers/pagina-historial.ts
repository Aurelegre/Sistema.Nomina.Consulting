import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { contextoAusencias } from "../ausencias.service";

export async function paginaHistorial(revision = false) {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (sesion.usuario.debeCambiarPassword) redirect("/cambiar-password");
  const contexto = await contextoAusencias(db, {
    usuarioId: sesion.usuario.id,
    sesionId: sesion.id,
  });
  if (!contexto.empleado) redirect("/sin-acceso");
  if (!contexto.puedeConsultarHistorico) redirect("/sin-acceso");
  return contexto;
}
