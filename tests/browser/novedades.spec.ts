import { test, expect } from "@playwright/test";
import { prepararNovedades } from "../helpers/novedades-fixture";

test("jefe registra y consulta novedades; cierre, permisos y vista móvil", async ({
  page,
  context,
}) => {
  const f = await prepararNovedades();
  try {
    await context.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/mi-departamento");
    await expect(
      page.getByRole("heading", { name: "Empleados de mi departamento" }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Período de planilla" }).click();
    await page
      .getByRole("option", {
        name: `01/${f.periodo.anio} · Abierto`,
        exact: true,
      })
      .click();
    const fila = page.getByRole("row").filter({ hasText: f.trabajador.nombre });
    await expect(fila).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("button", { name: "Registrar piezas fabricadas" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Registrar ventas" }),
    ).toHaveCount(0);
    await fila.getByRole("button", { name: "Detalle", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Q 4000.00");
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    for (const cantidad of ["1.25", "2.75"]) {
      await fila
        .getByRole("button", { name: "Registrar horas extras", exact: true })
        .click();
      await page.getByLabel("Cantidad de horas").fill(cantidad);
      await page
        .getByRole("button", { name: "Guardar registro", exact: true })
        .click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
    await expect(fila).toContainText("4.00");
    await fila
      .getByRole("button", { name: "Registrar horas dobles", exact: true })
      .click();
    await page.getByLabel("Cantidad de horas").fill("2");
    await page
      .getByRole("button", { name: "Guardar registro", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(fila).toContainText("2.00");
    await page.reload();
    await page.getByRole("combobox", { name: "Período de planilla" }).click();
    await page
      .getByRole("option", {
        name: `01/${f.periodo.anio} · Abierto`,
        exact: true,
      })
      .click();
    await expect(fila).toContainText("4.00");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/novedades-mobile.png",
      fullPage: true,
    });
    await f.db.periodoNomina.update({
      where: { id: f.periodo.id },
      data: { estado: "CERRADO" },
    });
    await page.reload();
    await page.getByRole("combobox", { name: "Período de planilla" }).click();
    await page
      .getByRole("option", {
        name: `01/${f.periodo.anio} · Cerrado`,
        exact: true,
      })
      .click();
    await expect(
      fila.getByRole("button", { name: "Registrar horas extras", exact: true }),
    ).toBeDisabled();
    await f.db.departamento.update({
      where: { id: f.departamento.id },
      data: { jefeId: null },
    });
    await page.reload();
    await expect(page).toHaveURL(/\/sin-acceso$/);
    await expect(
      page.getByRole("link", { name: "Mi departamento", exact: true }),
    ).toHaveCount(0);
  } finally {
    await f.limpiar();
  }
});
