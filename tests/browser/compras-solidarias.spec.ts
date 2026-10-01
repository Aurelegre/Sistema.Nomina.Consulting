import { test, expect, type Page } from "@playwright/test";
import { prepararCompras } from "../helpers/compras-fixture";
import {
  cerrarPeriodoNomina,
  crearPeriodoNomina,
} from "../../src/server/Periodo-Nomina/periodos-nomina.service";

async function guardar(page: Page, monto: string, detalle: string) {
  await page.getByLabel("Monto (Q)", { exact: true }).fill(monto);
  await page.getByLabel("Detalle de la compra", { exact: true }).fill(detalle);
  await page
    .getByRole("button", { name: "Guardar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("compras: Empleados y Asociación, filtros, edición, eliminación, cierre y permisos", async ({
  page,
  context,
}) => {
  const f = await prepararCompras();
  try {
    await context.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/empleados");
    const empleado = page
      .getByRole("row")
      .filter({ hasText: f.empleado.codigo });
    await empleado
      .getByRole("button", { name: "Tienda Solidaria", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("01/2091");
    await guardar(page, "75.25", "Alimentos desde empleados");
    await page.goto("/asociacion");
    await expect(page).toHaveURL(/\/asociacion\/compras$/);
    await expect(
      page.getByRole("heading", { name: "Compras solidarias", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Total filtrado: Q 75.25", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Nueva compra", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: `${f.otro.codigo} · ${f.otro.nombre}`,
        exact: true,
      })
      .click();
    await guardar(page, "20.50", "Compra desde asociación");
    await expect(
      page.getByText("Total filtrado: Q 95.75", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Filtrar empleado", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: `${f.empleado.codigo} · ${f.empleado.nombre}`,
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Total filtrado: Q 75.25", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Quitar filtro de empleado", exact: true })
      .click();
    await page.getByLabel("Buscar por detalle").fill("Alimentos");
    await expect(
      page.getByText("Total filtrado: Q 75.25", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Buscar por detalle").fill("");
    const fila = page
      .getByRole("row")
      .filter({ hasText: "Alimentos desde empleados" });
    await fila.getByRole("button", { name: "Editar", exact: true }).click();
    await guardar(page, "80.00", "Alimentos corregidos");
    await expect(
      page.getByText("Total filtrado: Q 100.50", { exact: true }),
    ).toBeVisible();
    const otra = page
      .getByRole("row")
      .filter({ hasText: "Compra desde asociación" });
    await otra.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    await expect(otra).toBeVisible();
    await otra.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Eliminar compra", exact: true })
      .click();
    await expect(otra).not.toBeVisible();
    await expect(
      page.getByText("Total filtrado: Q 80.00", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Total filtrado: Q 80.00", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/compras-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    // El formulario abierto debe rechazar el cierre ocurrido después de abrirlo.
    await page
      .getByRole("button", { name: "Nueva compra", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: `${f.empleado.codigo} · ${f.empleado.nombre}`,
        exact: true,
      })
      .click();
    await cerrarPeriodoNomina(f.db, f.periodo.id);
    await page.getByLabel("Monto (Q)").fill("10");
    await page.getByLabel("Detalle de la compra").fill("No debe guardarse");
    await page
      .getByRole("button", { name: "Guardar compra", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "No hay un período abierto",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.reload();
    await expect(
      page.getByText(
        "No hay un período abierto. Puedes consultar compras de períodos anteriores.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nueva compra", exact: true }),
    ).toBeDisabled();
    await page.getByRole("combobox", { name: "Período de compras" }).click();
    await page
      .getByRole("option", { name: "01/2091 · Cerrado", exact: true })
      .click();
    await expect(
      page.getByText("Total filtrado: Q 80.00", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editar", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Eliminar", exact: true }),
    ).toBeDisabled();
    await page.goto("/empleados");
    await empleado
      .getByRole("button", { name: "Tienda Solidaria", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "No hay un período abierto",
    );
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await f.db.empleado.update({
      where: { id: f.empleado.id },
      data: { estado: "INACTIVO" },
    });
    await page.reload();
    await expect(
      empleado.getByRole("button", { name: "Tienda Solidaria", exact: true }),
    ).toBeDisabled();
    await crearPeriodoNomina(f.db, { mes: 2, anio: 2091 });
    // Usuario solo lector no necesita acceso global a empleados o períodos.
    const lectura = await f.db.permiso.findUniqueOrThrow({
      where: { codigo: "ASSOCIATION.PURCHASES.VIEW" },
    });
    await f.db.rolPermiso.deleteMany({
      where: { rolId: f.rol.id, permisoId: { not: lectura.id } },
    });
    await page.goto("/asociacion/compras");
    await expect(
      page.getByRole("heading", { name: "Compras solidarias", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nueva compra", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Editar", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("combobox", { name: "Período de compras" }).click();
    await page
      .getByRole("option", { name: "01/2091 · Cerrado", exact: true })
      .click();
    await expect(
      page.getByText("Total filtrado: Q 80.00", { exact: true }),
    ).toBeVisible();
    await f.db.rolPermiso.deleteMany({ where: { rolId: f.rol.id } });
    await page.reload();
    await expect(page).toHaveURL(/\/sin-acceso$/);
  } finally {
    await f.limpiar();
  }
});
