import { test, expect } from "@playwright/test";
import { prepararNomina } from "../helpers/nomina-fixture";
import { ejecutarPendientes } from "../../src/server/nomina/nomina.worker";

test("generación, cierre, aviso al navegar, CSV y Mi Nómina", async ({
  page,
  context,
}) => {
  const f = await prepararNomina();
  try {
    await context.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/periodos");
    await expect(
      page.getByRole("button", { name: "Cerrar", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Nómina", exact: true }).click();
    await page
      .getByRole("button", { name: "Generar nómina", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "noviembre de 2026",
    );
    await page.getByRole("button", { name: "Confirmar generación" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "quedó en cola" }),
    ).toBeVisible();
    await page.goto("/empleados");
    await ejecutarPendientes(f.db);
    await expect(
      page.getByText("Nómina generada · noviembre de 2026"),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ir a Nómina" }).click();
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(
      page.getByText("COMPLETADA", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Detalle", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Empleado de nómina");
    await expect(page.getByRole("dialog")).toContainText("IGSS laboral");
    await page.keyboard.press("Escape");
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    expect((await descarga).suggestedFilename()).toBe("nomina-2026-11.csv");
    await page.getByRole("link", { name: "Mi Nómina", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Mi Nómina", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generar nómina", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Desde el período").fill("2026-12");
    await expect(
      page.getByText("No hay nóminas para los filtros seleccionados."),
    ).toBeVisible();
    await page.getByLabel("Desde el período").fill("2026-11");
    await page.getByRole("button", { name: "Detalle", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Empleado de nómina");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    // Linked users retain self access even with no administrative permissions.
    const rol = await f.db.rol.create({
      data: { codigo: `${f.prefijo}_self`, nombre: `${f.prefijo}_self` },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id },
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Mi Nómina", exact: true }),
    ).toBeVisible();
    await page.goto("/nomina");
    await expect(page).toHaveURL(/sin-acceso/);
  } finally {
    await f.db.$disconnect();
  }
});
