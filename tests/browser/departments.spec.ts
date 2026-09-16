import { test, expect, type Page } from "@playwright/test";
import { PrismaClient, type Departamento } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";
import { cambiarPrimeraPassword } from "../../src/server/sesion/auth.service";
import { hashPassword } from "../../src/server/sesion/Helpers/password";

const db = new PrismaClient();
const suffix = randomBytes(6).toString("hex");
const prefix = `ui_dept_${suffix}`;
const password = randomBytes(24).toString("base64url");
const nombreEditado = `Finanzas ${suffix}`;
const cuentaA = `00.UI${suffix}.01`;
const cuentaB = `00.UI${suffix}.02`;
let original: Departamento;
let versionEsperada: number;
let cantidadInicial: number;

test.beforeAll(async () => {
  await seed(db, { username: `${prefix}_admin`, password });
  const admin = await db.usuario.findUniqueOrThrow({
    where: { username: `${prefix}_admin` },
  });
  await cambiarPrimeraPassword(db, admin.id, password, `${password}new`);
  for (const [sufijo, permisos] of [
    ["lector", ["DEPARTMENTS.VIEW"]],
    ["sin_permiso", []],
  ] as const) {
    const rol = await db.rol.create({
      data: {
        codigo: `${prefix}_${sufijo}`,
        nombre: `${prefix}_${sufijo}`,
        permisos: {
          create: permisos.map((codigo) => ({
            permiso: { connect: { codigo } },
          })),
        },
      },
    });
    await db.usuario.create({
      data: {
        username: `${prefix}_${sufijo}`,
        nombre: sufijo,
        passwordHash: await hashPassword(password),
        debeCambiarPassword: false,
        rolId: rol.id,
      },
    });
  }
  original = await db.departamento.findUniqueOrThrow({
    where: { codigo: "FINANZAS" },
  });
  versionEsperada = original.version;
  cantidadInicial = await db.departamento.count();
});

test.afterAll(async () => {
  await db.departamento.deleteMany({
    where: { codigo: { startsWith: prefix.toUpperCase() } },
  });
  if (original) {
    await db.departamento.updateMany({
      where: {
        id: original.id,
        version: versionEsperada,
        nombre: nombreEditado,
        cuentaContable: { in: [cuentaA, cuentaB] },
      },
      data: {
        nombre: original.nombre,
        cuentaContable: original.cuentaContable,
        version: { increment: 1 },
      },
    });
  }
  await db.usuario.deleteMany({ where: { username: { startsWith: prefix } } });
  await db.intentoLogin.deleteMany({
    where: { username: { startsWith: prefix } },
  });
  await db.rol.deleteMany({ where: { codigo: { startsWith: prefix } } });
  await db.$disconnect();
});

async function login(page: Page, sufijo: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(`${prefix}_${sufijo}`);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(sufijo === "admin" ? `${password}new` : password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  // El primer acceso compila las rutas de Next.js en el servidor de desarrollo.
  await expect(page).toHaveURL("http://localhost:3100/", { timeout: 30000 });
}

test("edición modal, validación, concurrencia entre pestañas y persistencia", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, "admin");
  await page.getByRole("link", { name: "Departamentos", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(cantidadInicial + 1);
  await expect(page.getByRole("button", { name: /eliminar/i })).toHaveCount(0);
  await page.getByLabel("Buscar departamentos").fill("logistica");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByLabel("Buscar departamentos").fill("FINANZAS");
  const fila = page.getByRole("row").filter({ hasText: "FINANZAS" });
  await fila.getByRole("button", { name: "Editar" }).click();
  const modal = page.getByRole("dialog", { name: "Editar departamento" });
  await expect(modal.getByLabel("Código", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await modal.getByLabel("Nombre", { exact: true }).fill("Cambio descartado");
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await fila.getByRole("button", { name: "Editar" }).click();
  await expect(modal.getByLabel("Nombre", { exact: true })).toHaveValue(
    original.nombre,
  );
  await modal.getByLabel("Cuenta contable", { exact: true }).fill("   ");
  await modal.getByRole("button", { name: "Guardar departamento" }).click();
  await expect(
    modal.getByText("La cuenta contable es obligatoria"),
  ).toBeVisible();
  const otroNombre = (
    await db.departamento.findUniqueOrThrow({ where: { codigo: "PRODUCCION" } })
  ).nombre;
  await modal.getByLabel("Nombre", { exact: true }).fill(otroNombre);
  await modal.getByLabel("Cuenta contable", { exact: true }).fill(cuentaA);
  await modal.getByRole("button", { name: "Guardar departamento" }).click();
  await expect(
    modal.getByText("Ya existe un departamento con ese nombre."),
  ).toBeVisible();

  const segunda = await page.context().newPage();
  await segunda.goto("/departamentos");
  await segunda
    .getByRole("row")
    .filter({ hasText: "FINANZAS" })
    .getByRole("button", { name: "Editar" })
    .click();
  await modal.getByLabel("Nombre", { exact: true }).fill(nombreEditado);
  versionEsperada++;
  await modal.getByRole("button", { name: "Guardar departamento" }).click();
  await expect(modal).not.toBeVisible();
  await expect(fila).toContainText(cuentaA);
  const modalViejo = segunda.getByRole("dialog");
  await modalViejo.getByLabel("Cuenta contable", { exact: true }).fill(cuentaB);
  await modalViejo
    .getByRole("button", { name: "Guardar departamento" })
    .click();
  await expect(modalViejo.getByText(/El departamento cambió/)).toBeVisible();
  await modalViejo.getByRole("button", { name: "Cancelar" }).click();
  await segunda
    .getByRole("row")
    .filter({ hasText: "FINANZAS" })
    .getByRole("button", { name: "Editar" })
    .click();
  await expect(modalViejo.getByLabel("Nombre", { exact: true })).toHaveValue(
    nombreEditado,
  );
  await expect(
    modalViejo.getByLabel("Cuenta contable", { exact: true }),
  ).toHaveValue(cuentaA);
  await modalViejo.getByLabel("Cuenta contable", { exact: true }).fill(cuentaB);
  versionEsperada++;
  await modalViejo
    .getByRole("button", { name: "Guardar departamento" })
    .click();
  await expect(modalViejo).not.toBeVisible();
  await segunda.close();
  await page.reload();
  await expect(fila).toContainText(cuentaB);
  await page.screenshot({
    path: "test-results/departamentos.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await fila.getByRole("button", { name: "Editar" }).click();
  await page.screenshot({
    path: "test-results/departamentos-modal-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("consulta sin edición y acceso directo protegido", async ({ page }) => {
  await login(page, "lector");
  await page.goto("/departamentos");
  await expect(page.getByRole("row")).toHaveCount(cantidadInicial + 1);
  await expect(
    page.getByRole("button", {
      name: /^(Editar|Crear departamento|Desactivar)$/,
    }),
  ).toHaveCount(0);
  const response = await page.request.post("/api/trpc/departamentos.editar", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      json: {
        id: original.id,
        version: versionEsperada,
        nombre: nombreEditado,
        cuentaContable: cuentaB,
      },
    },
  });
  expect(response.status()).toBe(403);
  for (const [accion, entrada] of [
    [
      "crear",
      {
        codigo: `${prefix}_sin_permiso`,
        nombre: prefix,
        cuentaContable: "001",
      },
    ],
    ["desactivar", { id: original.id, version: versionEsperada }],
  ] as const) {
    const resultado = await page.request.post(
      `/api/trpc/departamentos.${accion}`,
      {
        headers: { Origin: "http://localhost:3100" },
        data: { json: entrada },
      },
    );
    expect(resultado.status()).toBe(403);
  }
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "sin_permiso");
  await expect(
    page.getByRole("link", { name: "Departamentos", exact: true }),
  ).toHaveCount(0);
  await page.goto("/departamentos");
  await expect(page).toHaveURL(/\/sin-acceso$/);
  const consulta = await page.request.get("/api/trpc/departamentos.listar");
  expect(consulta.status()).toBe(403);
});

test("crear y desactivar con cancelación, conflicto y estado persistido", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, "admin");
  await page.goto("/departamentos");
  await page
    .getByRole("button", { name: "Crear departamento", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Crear departamento" });
  await modal.getByLabel("Nombre", { exact: true }).fill("Descartado");
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await page
    .getByRole("button", { name: "Crear departamento", exact: true })
    .click();
  await expect(modal.getByLabel("Nombre", { exact: true })).toHaveValue("");
  const codigo = `${prefix}_nuevo`;
  const nombre = `Tecnología ${suffix}`;
  await modal.getByLabel("Código", { exact: true }).fill(codigo);
  await modal.getByLabel("Nombre", { exact: true }).fill(nombre);
  await modal.getByLabel("Cuenta contable", { exact: true }).fill("   ");
  await modal.getByRole("button", { name: "Crear departamento" }).click();
  await expect(
    modal.getByText("La cuenta contable es obligatoria"),
  ).toBeVisible();
  await modal.getByLabel("Cuenta contable", { exact: true }).fill("001.40");
  await modal.getByLabel("Código", { exact: true }).fill("finanzas");
  await modal.getByRole("button", { name: "Crear departamento" }).click();
  await expect(
    modal.getByText("Ya existe un departamento con ese código o nombre."),
  ).toBeVisible();
  await modal.getByLabel("Código", { exact: true }).fill(codigo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/departamentos-crear-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await modal.getByRole("button", { name: "Crear departamento" }).click();
  await expect(modal).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  const fila = page.getByRole("row").filter({ hasText: codigo.toUpperCase() });
  await expect(fila.getByText("Activo", { exact: true })).toBeVisible();
  await page.reload();
  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();
  const confirmacion = page.getByRole("alertdialog", {
    name: "Desactivar departamento",
  });
  await expect(confirmacion).toContainText(nombre);
  await confirmacion.getByRole("button", { name: "Cancelar" }).click();
  await expect(fila.getByText("Activo", { exact: true })).toBeVisible();
  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();

  const segunda = await page.context().newPage();
  await segunda.goto("/departamentos");
  await segunda
    .getByRole("row")
    .filter({ hasText: codigo.toUpperCase() })
    .getByRole("button", { name: "Editar" })
    .click();
  await segunda
    .getByRole("dialog")
    .getByLabel("Cuenta contable", { exact: true })
    .fill("001.41");
  await segunda.getByRole("button", { name: "Guardar departamento" }).click();
  await expect(segunda.getByRole("dialog")).not.toBeVisible();
  await segunda.close();

  await confirmacion
    .getByRole("button", { name: "Desactivar departamento" })
    .click();
  await expect(confirmacion.getByText(/El departamento cambió/)).toBeVisible();
  await confirmacion.getByRole("button", { name: "Cancelar" }).click();
  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();
  await confirmacion
    .getByRole("button", { name: "Desactivar departamento" })
    .click();
  await expect(confirmacion).not.toBeVisible();
  await expect(fila.getByText("Inactivo", { exact: true })).toBeVisible();
  await expect(
    fila.getByRole("button", { name: "Desactivar", exact: true }),
  ).toHaveCount(0);
  await expect(fila).toContainText("001.41");
  await page.reload();
  await expect(fila.getByText("Inactivo", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/departamentos-estados.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "lector");
  await page.goto("/departamentos");
  await expect(fila.getByText("Inactivo", { exact: true })).toBeVisible();
  await expect(fila.getByRole("button")).toHaveCount(0);
});
