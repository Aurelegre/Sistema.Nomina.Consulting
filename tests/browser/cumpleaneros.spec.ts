import { test, expect } from "@playwright/test";
import { prepararCumpleaneros } from "../helpers/cumpleaneros-fixture";
test("cumpleañeros: filtros, descargas y permisos", async ({
  page,
  context,
}) => {
  const f = await prepararCumpleaneros();
  try {
    await context.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/reportes");
    await page.getByRole("link", { name: "Abrir Cumpleañeros" }).click();
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page.getByLabel("Mes", { exact: true }).click();
    await page.getByRole("option", { name: "febrero", exact: true }).click();
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(
      page.getByText("Total: 2 empleados", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Empleado bisiesto", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page.getByLabel("Estado", { exact: true }).click();
    await page.getByRole("option", { name: "Todos", exact: true }).click();
    await page.getByLabel("Departamento", { exact: true }).click();
    await page
      .getByRole("option", { name: f.departamento.nombre, exact: true })
      .click();
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(
      page.getByRole("cell", { name: "29/02", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Zoe de prueba", exact: true }),
    ).toHaveCount(0);
    for (const formato of ["CSV", "PDF"]) {
      const promise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Exportar " + formato }).click();
      const file = await promise;
      expect(file.suggestedFilename()).toBe(
        "cumpleaneros-02." + formato.toLowerCase(),
      );
      await file.saveAs("test-results/cumpleaneros." + formato.toLowerCase());
    }
    await page.screenshot({
      path: "test-results/cumpleaneros-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/cumpleaneros-mobile.png",
      fullPage: true,
    });
    const permiso = await f.db.permiso.findUniqueOrThrow({
      where: { codigo: "BIRTHDAYS_REPORT.VIEW" },
    });
    const rol = await f.db.rol.create({
      data: {
        codigo: f.prefijo + "_solo",
        nombre: "Consulta cumpleaños",
        permisos: { create: { permisoId: permiso.id } },
      },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id },
    });
    await page.goto("/reportes");
    await page.getByRole("link", { name: "Abrir Cumpleañeros" }).click();
    await expect(
      page.getByRole("heading", { name: "Cumpleañeros", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Exportar PDF" }),
    ).toHaveCount(0);
    await f.db.rolPermiso.deleteMany({ where: { rolId: rol.id } });
    await page.reload();
    await expect(page).toHaveURL(/sin-acceso/);
  } finally {
    await f.db.$disconnect();
  }
});
