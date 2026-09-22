import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { contextoAusencias } from "../ausencias.service";
export async function paginaAusencias(revision = false) {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (sesion.usuario.debeCambiarPassword) redirect("/cambiar-password");
  if (!sesion.usuario.permisos.includes("ABSENCES.VIEW"))
    redirect("/sin-acceso");
  const contexto = await contextoAusencias(db, {
    usuarioId: sesion.usuario.id,
    sesionId: sesion.id,
  });
  if (
    !contexto.empleado ||
    (revision && !contexto.empleado.departamentoQueDirige)
  )
    redirect("/sin-acceso");
  return contexto;
}
