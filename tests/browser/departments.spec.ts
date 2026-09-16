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
});

test.afterAll(async () => {
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
  await expect(page.getByRole("row")).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: /crear|eliminar|desactivar/i }),
  ).toHaveCount(0);
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
  await expect(page.getByRole("row")).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: "Editar", exact: true }),
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
