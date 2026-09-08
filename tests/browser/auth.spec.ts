import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";

const db = new PrismaClient();
const username = `test_browser_${randomBytes(6).toString("hex")}`;
const temporal = randomBytes(24).toString("base64");
const definitiva = randomBytes(24).toString("base64");

test.beforeAll(async () => {
  await seed(db, { username, password: temporal });
});
test.afterAll(async () => {
  await db.usuario.deleteMany({ where: { username } });
  await db.intentoLogin.deleteMany({ where: { username } });
  await db.$disconnect();
});

test("primer acceso exige cambio y permite entrar con la contraseña nueva", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/trpc/auth.login", {
    headers: { Origin: "https://otro.example" },
    data: {},
  });
  expect(response.status()).toBe(403);
  await page.goto("/periodos");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(temporal);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/cambiar-password$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/periodos");
  await expect(page).toHaveURL(/\/cambiar-password$/);
  await page.getByLabel("Contraseña temporal", { exact: true }).fill(temporal);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(definitiva);
  await page
    .getByLabel("Confirmar nueva contraseña", { exact: true })
    .fill(temporal);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(
    page.getByText("Las contraseñas nuevas no coinciden"),
  ).toBeVisible();
  await page
    .getByLabel("Confirmar nueva contraseña", { exact: true })
    .fill(definitiva);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(definitiva);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/periodos");
  await expect(
    page.getByRole("heading", { name: "Períodos registrados" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: "test-results/login.png" });
});
