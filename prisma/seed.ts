import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { PERMISOS } from "../src/shared/permisos";
import { hashPassword } from "../src/server/security/password";

export async function seed(
  db: PrismaClient,
  config: {
    username?: string;
    nombre?: string;
    password?: string;
  },
) {
  const username = (config.username ?? "admin").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,100}$/.test(username))
    throw new Error("SEED_ADMIN_USERNAME no es válido");
  const nombre = config.nombre?.trim() ?? "Administrador";
  if (nombre.length > 150)
    throw new Error("SEED_ADMIN_NAME supera 150 caracteres");
  const existente = await db.usuario.findUnique({ where: { username } });
  // Una segunda ejecución nunca restablece contraseñas, estado ni rol del usuario.
  if (!existente && !config.password) {
    throw new Error(
      "Configura SEED_ADMIN_PASSWORD para crear el primer administrador",
    );
  }
  const passwordHash = !existente
    ? await hashPassword(config.password!)
    : undefined;

  await db.$transaction(
    async (tx) => {
      const rol = await tx.rol.upsert({
        where: { codigo: "ADMINISTRADOR" },
        create: {
          codigo: "ADMINISTRADOR",
          nombre: "Administrador",
          descripcion: "Administración del sistema",
        },
        update: {},
      });
      for (const [codigo, nombrePermiso] of Object.entries(PERMISOS)) {
        const permiso = await tx.permiso.upsert({
          where: { codigo },
          create: { codigo, nombre: nombrePermiso },
          update: { nombre: nombrePermiso },
        });
        await tx.rolPermiso.upsert({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: permiso.id } },
          create: { rolId: rol.id, permisoId: permiso.id },
          update: {},
        });
      }
      if (passwordHash) {
        await tx.usuario.upsert({
          where: { username },
          create: {
            username,
            nombre,
            passwordHash,
            rolId: rol.id,
            debeCambiarPassword: true,
          },
          update: {},
        });
      }
      const admin = await tx.usuario.findUnique({
        where: { username },
        include: { rol: true },
      });
      if (
        admin?.estado !== "ACTIVO" ||
        admin.rol.estado !== "ACTIVO" ||
        admin.rol.codigo !== "ADMINISTRADOR"
      ) {
        throw new Error(
          "La cuenta configurada existe pero no es un administrador activo. El seed no altera cuentas existentes.",
        );
      }
    },
    { timeout: 30000 },
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = new PrismaClient();
  try {
    await seed(db, {
      username: process.env.SEED_ADMIN_USERNAME,
      nombre: process.env.SEED_ADMIN_NAME,
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    console.info(
      "Catálogo y administrador preparados. Las credenciales existentes se conservaron.",
    );
  } catch {
    console.error(
      "Seed fallido. Verifica conexión, migraciones, usuario y contraseña temporal (mínimo 12 caracteres). No se sobrescriben cuentas existentes.",
    );
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
