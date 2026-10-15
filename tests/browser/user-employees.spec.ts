import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";
import { cambiarPrimeraPassword } from "../../src/server/sesion/auth.service";

const db = new PrismaClient();
const prefijo = `ui_link_${randomBytes(5).toString("hex")}`;
const password = randomBytes(24).toString("base64url");
let departamentoId: number;
let empleadoId: number;
let segundoId: number;
test.beforeAll(async () => {
  await seed(db, { username: `${prefijo}_admin`, password });
  const admin = await db.usuario.findUniqueOrThrow({
    where: { username: `${prefijo}_admin` },
  });
  await cambiarPrimeraPassword(db, admin.id, password, `${password}new`);
  await db.rol.create({ data: { codigo: prefijo, nombre: prefijo } });
  departamentoId = (
    await db.departamento.create({
      data: { codigo: prefijo, nombre: prefijo, cuentaContable: "TEST" },
    })
  ).id;
  for (const sufijo of ["primero", "segundo", "inactivo"]) {
    const empleado = await db.empleado.create({
      data: {
        codigo: `${prefijo}_${sufijo}`,
        nombre: `Empleado ${sufijo} ${prefijo}`,
        departamentoId,
        estado: sufijo === "inactivo" ? "INACTIVO" : "ACTIVO",
        fechaNacimiento: new Date("1990-01-01"),
        fechaIngreso: new Date("2020-01-01"),
        salarioBase: 4000,
      },
    });
    if (sufijo === "primero") empleadoId = empleado.id;
    if (sufijo === "segundo") segundoId = empleado.id;
  }
});
test.afterAll(async () => {
  await db.usuario.deleteMany({ where: { username: { startsWith: prefijo } } });
  await db.intentoLogin.deleteMany({
    where: { username: { startsWith: prefijo } },
  });
  await db.empleado.deleteMany({ where: { codigo: { startsWith: prefijo } } });
  await db.departamento.deleteMany({ where: { codigo: prefijo } });
  await db.rol.deleteMany({ where: { codigo: prefijo } });
  await db.$disconnect();
});

test("usuario con empleado opcional y asignación posterior con selector reutilizado", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(`${prefijo}_admin`);
  await page.getByLabel("Contraseña", { exact: true }).fill(`${password}new`);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/", { timeout: 30000 });
  await page.goto("/usuarios");
  await page
    .getByRole("button", { name: "Crear usuario", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Crear usuario",
    exact: true,
  });
  await editor
    .getByLabel("Nombre", { exact: true })
    .fill("Usuario con empleado");
  await editor.getByLabel("Usuario", { exact: true }).fill(`${prefijo}_con`);
  await editor.getByRole("combobox", { name: "Rol del usuario" }).click();
  await page.getByRole("option", { name: prefijo, exact: true }).click();
  await editor
    .getByRole("button", { name: "Asignar empleado", exact: true })
    .click();
  const selector = page.getByRole("dialog", {
    name: "Asignar empleado",
    exact: true,
  });
  await selector
    .getByRole("combobox", { name: "Departamento del empleado" })
    .click();
  await page.getByRole("option", { name: prefijo, exact: true }).click();
  await expect(selector.getByRole("row")).toHaveCount(3);
  await selector
    .getByLabel("Buscar empleados disponibles")
    .fill(`${prefijo}_primero`);
  await expect(selector.getByRole("row")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await selector.getByRole("button", { name: "Asignar", exact: true }).click();
  const confirmar = page.getByRole("alertdialog", {
    name: "Confirmar asignación",
  });
  await confirmar
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(selector).toBeVisible();
  expect(
    (
      await db.empleado.findUniqueOrThrow({
        where: { id: empleadoId },
        include: { usuario: true },
      })
    ).usuario,
  ).toBeNull();
  await selector.getByRole("button", { name: "Asignar", exact: true }).click();
  await confirmar
    .getByRole("button", { name: "Confirmar asignación", exact: true })
    .click();
  await expect(selector).not.toBeVisible();
  await expect(editor.getByLabel("Usuario", { exact: true })).toHaveValue(
    `${prefijo}_con`,
  );
  await expect(editor).toContainText(`${prefijo}_primero`);
  // La confirmación prepara la selección; aún no existe el usuario ni el vínculo.
  expect(
    await db.usuario.count({ where: { username: `${prefijo}_con` } }),
  ).toBe(0);
  await editor
    .getByRole("button", { name: "Guardar usuario", exact: true })
    .click();
  const credencial = page.getByRole("dialog", {
    name: "Contraseña temporal",
    exact: true,
  });
  await expect(credencial).toBeVisible();
  expect(
    (
      await db.usuario.findUniqueOrThrow({
        where: { username: `${prefijo}_con` },
      })
    ).empleadoId,
  ).toBe(empleadoId);
  await credencial.getByRole("button", { name: /Cerrar/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("button", { name: "Crear usuario", exact: true })
    .click();
  await expect(editor).toContainText("Sin empleado asignado");
  await editor
    .getByLabel("Nombre", { exact: true })
    .fill("Usuario sin empleado");
  await editor.getByLabel("Usuario", { exact: true }).fill(`${prefijo}_sin`);
  await editor.getByRole("combobox", { name: "Rol del usuario" }).click();
  await page.getByRole("option", { name: prefijo, exact: true }).click();
  await editor
    .getByRole("button", { name: "Guardar usuario", exact: true })
    .click();
  await expect(credencial).toBeVisible();
  expect(
    (
      await db.usuario.findUniqueOrThrow({
        where: { username: `${prefijo}_sin` },
      })
    ).empleadoId,
  ).toBeNull();
  await credencial.getByRole("button", { name: /Cerrar/ }).click();
  await page.getByLabel("Buscar usuarios").fill(`${prefijo}_sin`);
  const fila = page.getByRole("row").filter({ hasText: `${prefijo}_sin` });
  await fila
    .getByRole("button", { name: "Asignar empleado", exact: true })
    .click();
  await selector.getByLabel("Buscar empleados disponibles").fill(prefijo);
  await expect(selector.getByRole("row")).toHaveCount(2);
  await expect(selector).toContainText(`${prefijo}_segundo`);
  await selector.getByRole("button", { name: "Asignar", exact: true }).click();
  await confirmar
    .getByRole("button", { name: "Confirmar asignación", exact: true })
    .click();
  await expect(selector).not.toBeVisible();
  await expect(fila).toContainText(`${prefijo}_segundo`);
  expect(
    (
      await db.usuario.findUniqueOrThrow({
        where: { username: `${prefijo}_sin` },
      })
    ).empleadoId,
  ).toBe(segundoId);
  await page.screenshot({
    path: "test-results/usuarios-empleado.png",
    fullPage: true,
    animations: "disabled",
  });
});
