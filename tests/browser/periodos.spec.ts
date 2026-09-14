import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { seed } from "../../prisma/seed";
import { cambiarPrimeraPassword } from "../../src/server/sesion/auth.service";

const db = new PrismaClient();
const username = `ui_periodos_${randomBytes(6).toString("hex")}`;
const password = randomBytes(24).toString("base64url");
let anio: number;
let periodoId: number | undefined;

test.beforeAll(async () => {
  await seed(db, { username, password });
  const usuario = await db.usuario.findUniqueOrThrow({ where: { username } });
  await cambiarPrimeraPassword(db, usuario.id, password, `${password}new`);
  do {
    anio = randomInt(10000, 1000000);
  } while (await db.periodoNomina.findFirst({ where: { anio, mes: 1 } }));
});

test.afterAll(async () => {
  if (periodoId !== undefined) {
    await db.periodoNomina.delete({ where: { id: periodoId } });
  }
  await db.usuario.deleteMany({ where: { username } });
  await db.intentoLogin.deleteMany({ where: { username } });
  await db.$disconnect();
});

test("períodos conserva creación, duplicados, cancelación y cierre confirmado", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(`${password}new`);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/periodos");
  await page.getByRole("combobox", { name: "Mes", exact: true }).click();
  await page.getByRole("option", { name: "Enero", exact: true }).click();
  await page.getByLabel("Año", { exact: true }).fill(String(anio));
  await page
    .getByRole("button", { name: "Crear período", exact: true })
    .click();
  const fila = page.getByRole("row").filter({ hasText: `Enero ${anio}` });
  await expect(fila).toContainText("ABIERTO");
  periodoId = (
    await db.periodoNomina.findFirstOrThrow({ where: { anio, mes: 1 } })
  ).id;
  await page
    .getByRole("button", { name: "Crear período", exact: true })
    .click();
  await expect(
    page.getByText(
      "Ya existe un período de nómina para el mes y año seleccionados.",
    ),
  ).toBeVisible();

  await fila.getByRole("button", { name: "Cerrar", exact: true }).click();
  const modal = page.getByRole("alertdialog", {
    name: "Cerrar período de nómina",
  });
  await expect(modal).toContainText(`Enero ${anio}`);
  await modal.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(fila).toContainText("ABIERTO");
  await fila.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();

  await fila.getByRole("button", { name: "Cerrar", exact: true }).click();
  await modal
    .getByRole("button", { name: "Confirmar cierre", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await expect(fila).toContainText("CERRADO");
  await expect(
    fila.getByRole("button", { name: "Cerrar", exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await expect(fila).toContainText("CERRADO");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/periodos-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
