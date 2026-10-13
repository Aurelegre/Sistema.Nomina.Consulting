import { test, expect } from "@playwright/test";
import { prepararReporte } from "../helpers/reportes-fixture";

test("vista previa, generación manual, reapertura, CSV/PDF y permisos", async ({
  page,
  context,
}) => {
  const f = await prepararReporte();
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
    await page.getByRole("link", { name: "Abrir póliza contable" }).click();
    await expect(
      page.getByRole("button", { name: "Generar reporte", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Vista previa de póliza contable" }),
    ).toBeVisible();
    await expect(
      page.getByText("Mostrando documento…", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/No fue posible mostrar/)).toHaveCount(0);
    await expect(page.getByLabel("Período de nómina")).toContainText(
      "noviembre de 2026",
    );
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await expect(page.getByText(/Página 2 de/)).toBeVisible();
    await page.getByRole("button", { name: "Anterior", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Exportar PDF" }),
    ).toHaveCount(0);
    expect(await f.db.reportePoliza.count()).toBe(0);
    await page
      .getByRole("button", { name: "Generar reporte", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar generación" }).click();
    await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
    expect(await f.db.reportePoliza.count()).toBe(1);
    for (const formato of ["CSV", "PDF"]) {
      const descarga = page.waitForEvent("download");
      await page.getByRole("button", { name: `Exportar ${formato}` }).click();
      expect((await descarga).suggestedFilename()).toBe(
        `poliza-2026-11.${formato.toLowerCase()}`,
      );
      if (formato === "PDF")
        await (await descarga).saveAs("test-results/poliza.pdf");
    }
    await page.reload();
    await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generar reporte", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Mostrando documento…", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/No fue posible mostrar/)).toHaveCount(0);
    await page.screenshot({
      path: "test-results/reportes-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("img", { name: "Página 1 de la póliza contable" }),
    ).toHaveCSS("width", /^(2|3)\d\d(\.\d+)?px$/);
    await expect(
      page.getByText("Mostrando documento…", { exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/reportes-mobile.png",
      fullPage: true,
    });
    // VIEW alone grants the report and navigation, but never export or generation.
    const permiso = await f.db.permiso.findUniqueOrThrow({
      where: { codigo: "ACCOUNTING_POLICY.VIEW" },
    });
    const rol = await f.db.rol.create({
      data: {
        codigo: `${f.prefijo}_view`,
        nombre: `${f.prefijo}_view`,
        permisos: { create: { permisoId: permiso.id } },
      },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id },
    });
    await page.reload();
    await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Exportar PDF" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Exportar CSV" }),
    ).toHaveCount(0);
    await f.db.rolPermiso.deleteMany({ where: { rolId: rol.id } });
    await page.reload();
    await expect(page).toHaveURL(/sin-acceso/);
  } finally {
    await f.db.$disconnect();
  }
});
