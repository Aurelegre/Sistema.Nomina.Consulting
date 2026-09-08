import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { hashPassword, verificarPassword } from "../security/password";

export const SESSION_COOKIE = "nomina_session";
const SESSION_SECONDS = 8 * 60 * 60;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const usuarioPublico = {
  id: true,
  username: true,
  nombre: true,
  debeCambiarPassword: true,
  estado: true,
  rol: { include: { permisos: { include: { permiso: true } } } },
} as const;

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
    sesion.usuario.rol.estado !== "ACTIVO"
  )
    return null;
  return {
    id: sesion.id,
    usuario: {
      id: sesion.usuario.id,
      username: sesion.usuario.username,
      nombre: sesion.usuario.nombre,
      debeCambiarPassword: sesion.usuario.debeCambiarPassword,
      permisos: sesion.usuario.rol.permisos.map(
        ({ permiso }) => permiso.codigo,
      ),
    },
  };
}

export function cookieSesion(token: string, borrar = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${borrar ? 0 : SESSION_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function iniciarSesion(
  db: PrismaClient,
  username: string,
  password: string,
) {
  const ahora = new Date();
  await db.intentoLogin.updateMany({
    where: { username, ventanaHasta: { lte: ahora } },
    data: {
      intentos: 0,
      ventanaHasta: new Date(ahora.getTime() + 15 * 60 * 1000),
    },
  });
  const intento = await db.intentoLogin.upsert({
    where: { username },
    create: {
      username,
      ventanaHasta: new Date(ahora.getTime() + 15 * 60 * 1000),
    },
    update: { intentos: { increment: 1 } },
  });
  if (intento.intentos > 5)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    });
  const usuario = await db.usuario.findUnique({
    where: { username },
    include: { rol: true },
  });
  const valido = usuario
    ? await verificarPassword(usuario.passwordHash, password)
    : false;
  if (
    !valido ||
    usuario?.estado !== "ACTIVO" ||
    usuario.rol.estado !== "ACTIVO"
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciales inválidas",
    });
  }
  const token = randomBytes(32).toString("hex");
  await db.$transaction(async (tx) => {
    // Evita crear una sesión con una contraseña que cambió durante el login.
    const vigente = await tx.usuario.updateMany({
      where: {
        id: usuario.id,
        passwordHash: usuario.passwordHash,
        estado: "ACTIVO",
        rol: { estado: "ACTIVO" },
      },
      data: { estado: "ACTIVO" },
    });
    if (vigente.count !== 1) throw new TRPCError({ code: "UNAUTHORIZED" });
    await tx.sesion.create({
      data: {
        tokenHash: digest(token),
        usuarioId: usuario.id,
        fechaExpiracion: new Date(Date.now() + SESSION_SECONDS * 1000),
      },
    });
    await tx.intentoLogin.deleteMany({ where: { username } });
  });
  return { token, debeCambiarPassword: usuario.debeCambiarPassword };
}

export async function cambiarPrimeraPassword(
  db: PrismaClient,
  usuarioId: number,
  passwordActual: string,
  nuevaPassword: string,
) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.debeCambiarPassword || usuario.estado !== "ACTIVO")
    throw new TRPCError({ code: "FORBIDDEN" });
  if (!(await verificarPassword(usuario.passwordHash, passwordActual)))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La contraseña actual no es correcta",
    });
  if (await verificarPassword(usuario.passwordHash, nuevaPassword))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La nueva contraseña debe ser diferente de la temporal",
    });
  const passwordHash = await hashPassword(nuevaPassword);
  await db.$transaction(async (tx) => {
    const resultado = await tx.usuario.updateMany({
      where: {
        id: usuarioId,
        passwordHash: usuario.passwordHash,
        debeCambiarPassword: true,
        estado: "ACTIVO",
        rol: { estado: "ACTIVO" },
      },
      data: { passwordHash, debeCambiarPassword: false },
    });
    if (resultado.count !== 1)
      throw new TRPCError({
        code: "CONFLICT",
        message: "La cuenta cambió. Inicia sesión nuevamente.",
      });
    await tx.sesion.deleteMany({ where: { usuarioId } });
  });
}
