import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { type CodigoPermiso } from "~/server/permisos/Helpers/permisos";
import { obtenerSesion } from "../../sesion/Helpers/sesion.helper";

export async function permisoPagina(permiso: CodigoPermiso) {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (sesion.usuario.debeCambiarPassword) redirect("/cambiar-password");
  if (!sesion.usuario.permisos.includes(permiso)) redirect("/sin-acceso");
  return sesion.usuario;
}
