import type { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { usuarioPublico } from "../Models/usuarioPublico.Model";

//nombre de la cookie de sesión
export const SESSION_COOKIE = "nomina_session";

//tiempo de vida de la sesión en segundos (8 horas)
export const SESSION_SECONDS = 8 * 60 * 60;

// Crea un hash seguro del token de sesión para almacenarlo en la base de datos.
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Obtiene la sesión activa a partir de la cookie de sesión en los headers.
export async function obtenerSesion(db: PrismaClient, headers: Headers) {
  const token = headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sesion = await db.sesion.findUnique({
    where: { tokenHash: digest(token) },
    include: { usuario: { select: usuarioPublico } },
  });
  if (
    !sesion ||
    sesion.fechaExpiracion <= new Date() ||
    sesion.usuario.estado !== "ACTIVO" ||
    sesion.usuario.rol.estado !== "ACTIVO" ||
    (sesion.usuario.empleado !== null &&
      sesion.usuario.empleado.estado !== "ACTIVO")
  )
    return null;
  return {
    id: sesion.id,
    usuario: {
      id: sesion.usuario.id,
      empleadoId: sesion.usuario.empleadoId,
      username: sesion.usuario.username,
      nombre: sesion.usuario.nombre,
      debeCambiarPassword: sesion.usuario.debeCambiarPassword,
      permisos: sesion.usuario.rol.permisos.map(
        ({ permiso }) => permiso.codigo,
      ),
      rolId: sesion.usuario.rol.id,
      rolCodigo: sesion.usuario.rol.codigo,
    },
  };
}

// Crea una nueva sesión para el usuario y devuelve el token de sesión.
export function cookieSesion(token: string, borrar = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${borrar ? 0 : SESSION_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
