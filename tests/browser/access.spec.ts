import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";
import { cambiarPrimeraPassword } from "../../src/server/sesion/auth.service";
import { hashPassword } from "../../src/server/sesion/Helpers/password";

const db = new PrismaClient();
const sufijo = randomBytes(5).toString("hex");
const prefijo = `ui_access_${sufijo}_`;
const codigo = `UI_${sufijo.toUpperCase()}_`;
const admin = `${prefijo}admin`;
const usuario = `${prefijo}usuario`;
const password = randomBytes(24).toString("base64url");
const nombreRol = `Operación ${sufijo}`;
const nombreAlterno = `Consulta ${sufijo}`;

test.beforeAll(async () => {
  await seed(db, { username: admin, password });
  const cuenta = await db.usuario.findUniqueOrThrow({
    where: { username: admin },
  });
  await cambiarPrimeraPassword(db, cuenta.id, password, `${password}new`);
  const permiso = await db.permiso.findUniqueOrThrow({
    where: { codigo: "PAYROLL_PERIODS.VIEW" },
  });
  await db.rol.create({
    data: {
      codigo: `${codigo}CONSULTA`,
      nombre: nombreAlterno,
      permisos: { create: { permisoId: permiso.id } },
    },
  });
  const permisoRol = await db.permiso.findUniqueOrThrow({
    where: { codigo: "ROLES.VIEW" },
  });
  const rolLectura = await db.rol.create({
    data: {
      codigo: `${codigo}LECTURA`,
      nombre: `Lectura ${sufijo}`,
      permisos: { create: { permisoId: permisoRol.id } },
    },
  });
  await db.usuario.create({
    data: {
      username: `${prefijo}lector`,
      nombre: "Lector de roles",
      rolId: rolLectura.id,
      passwordHash: await hashPassword(password),
      debeCambiarPassword: false,
    },
  });
});
test.afterAll(async () => {
  await db.usuario.deleteMany({ where: { username: { startsWith: prefijo } } });
  await db.intentoLogin.deleteMany({
    where: { username: { startsWith: prefijo } },
  });
  await db.rol.deleteMany({ where: { codigo: { startsWith: codigo } } });
  await db.$disconnect();
});

test("administrador gestiona roles, permisos, usuarios y contraseñas", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(admin);
  await page.getByLabel("Contraseña", { exact: true }).fill(`${password}new`);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/roles");
  await page.getByRole("button", { name: "Crear rol", exact: true }).click();
  await page.getByLabel("Código", { exact: true }).fill(`${codigo}OPERACION`);
  await page.getByLabel("Nombre", { exact: true }).fill(nombreRol);
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Rol de prueba funcional");
  await page.getByRole("button", { name: "Guardar rol", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Buscar roles").fill(nombreRol);
  const filaRol = page.getByRole("row").filter({ hasText: nombreRol });
  await filaRol.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Descripción", { exact: true }).fill("Rol actualizado");
  await page.getByRole("button", { name: "Guardar rol", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await filaRol.getByRole("button", { name: "Asignar permisos" }).click();
  await page.getByLabel("Buscar permisos del rol").fill("PAYROLL_PERIODS.VIEW");
  await page.getByRole("checkbox", { name: /Consultar períodos/ }).check();
  await page
    .getByRole("button", { name: "Guardar permisos", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill(`Operador ${sufijo}`);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByRole("combobox", { name: "Rol del usuario" }).click();
  await page.getByRole("option", { name: nombreRol, exact: true }).click();
  await page.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(
    page.getByRole("dialog", { name: "Contraseña temporal", exact: true }),
  ).toBeVisible();
  const temporal = await page
    .getByLabel("Contraseña temporal generada")
    .inputValue();
  expect(temporal.length).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Buscar usuarios").fill(usuario);
  const fila = page.getByRole("row").filter({ hasText: usuario });
  await fila.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill(`Editado ${sufijo}`);
  await page.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(fila).toContainText(`Editado ${sufijo}`);
  await fila.getByRole("button", { name: "Cambiar rol" }).click();
  await page.getByRole("combobox", { name: "Rol del usuario" }).click();
  await page.getByRole("option", { name: nombreAlterno, exact: true }).click();
  await page.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(fila).toContainText(nombreAlterno);
  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(fila).toContainText("Inactivo");
  await fila.getByRole("button", { name: "Activar", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    fila.getByRole("button", { name: "Desactivar", exact: true }),
  ).toBeVisible();
  await fila.getByRole("button", { name: "Restablecer contraseña" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña temporal generada")).toBeVisible();
  const nuevaTemporal = await page
    .getByLabel("Contraseña temporal generada")
    .inputValue();
  expect(nuevaTemporal).not.toBe(temporal);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
  await expect(
    fila.getByRole("button", { name: "Editar", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/usuarios.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/roles");
  await page.getByLabel("Buscar roles").fill(nombreRol);
  await filaRol
    .getByRole("button", { name: "Desactivar", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(filaRol).toContainText("Inactivo");
  await filaRol.getByRole("button", { name: "Activar", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await page.goto("/permisos");
  await page.getByLabel("Buscar permisos").fill("PAYROLL_PERIODS.VIEW");
  await expect(
    page.getByRole("row").filter({ hasText: "PAYROLL_PERIODS.VIEW" }),
  ).toContainText(nombreRol);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Permisos", exact: true, level: 2 }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/permisos-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(nuevaTemporal);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/cambiar-password$/);
  await page
    .getByLabel("Contraseña temporal", { exact: true })
    .fill(nuevaTemporal);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(password);
  await page
    .getByLabel("Confirmar nueva contraseña", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/sin-acceso$/);
  await page.goto("/periodos");
  await expect(
    page.getByRole("heading", { name: "Períodos registrados" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear período", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cerrar", exact: true }),
  ).not.toBeVisible();
});

test("consulta de roles independiente del permiso de usuarios", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(`${prefijo}lector`);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/roles");
  await expect(
    page.getByRole("heading", { name: "Roles", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear rol", exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Administración de acceso" })
      .getByRole("link", { name: "Usuarios", exact: true }),
  ).not.toBeVisible();
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/sin-acceso$/);
});
