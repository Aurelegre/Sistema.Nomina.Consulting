import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

// La unicidad de período abierto es global. Probar en una BD temporal evita
// cerrar períodos del usuario o mezclar fixtures con su información operativa.
const principal = process.env.DATABASE_URL;
if (!principal) throw new Error("DATABASE_URL no configurada");
const nombre = `nomina_test_tienda_${randomBytes(6).toString("hex")}`;
const usarShadow = process.argv.includes("--shadow");
if (usarShadow && !process.env.SHADOW_DATABASE_URL)
  throw new Error("SHADOW_DATABASE_URL no configurada");
const destino = new URL(
  usarShadow ? process.env.SHADOW_DATABASE_URL! : principal,
);
if (!usarShadow) destino.pathname = `/${nombre}`;
if (
  decodeURIComponent(destino.pathname).toLowerCase() ===
  decodeURIComponent(new URL(principal).pathname).toLowerCase()
)
  throw new Error("La base de pruebas debe estar separada de la principal");
const admin = new PrismaClient();
let creada = false;
// migrate reset/deploy no usan shadow. Mantener una URL auxiliar distinta evita
// que Prisma rechace la configuración al probar sobre la shadow autorizada.
// Nunca apuntar esta URL auxiliar a la base principal.
const shadowNoUtilizada = new URL(destino);
shadowNoUtilizada.pathname = `/${nombre}_unused`;
const ejecutar = (args: string[]) => {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: destino.toString(),
      SHADOW_DATABASE_URL: shadowNoUtilizada.toString(),
      TIENDA_TEST_ISOLATED: "1",
    },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
};
try {
  if (!usarShadow) {
    await admin.$executeRawUnsafe(
      `CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    creada = true;
  }
  const migracion = ejecutar([
    "node_modules/prisma/build/index.js",
    "migrate",
    ...(usarShadow
      ? ["reset", "--force", "--skip-seed", "--skip-generate"]
      : ["deploy"]),
  ]);
  if (migracion) process.exitCode = migracion;
  else if (process.argv[2] === "ui")
    process.exitCode = ejecutar([
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      "playwright.tienda.config.ts",
    ]);
  else
    process.exitCode = ejecutar([
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "--test-timeout=60000",
      "tests/compras-solidarias.test.ts",
      "tests/novedades.test.ts",
    ]);
} finally {
  // Solo la BD aleatoria creada por esta ejecución; nunca principal ni shadow.
  if (
    !/^nomina_test_tienda_[a-f0-9]{12}$/.test(nombre) ||
    destino.pathname === new URL(principal).pathname
  )
    throw new Error("Destino de limpieza inválido");
  if (creada)
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${nombre}\``);
  await admin.$disconnect();
}
