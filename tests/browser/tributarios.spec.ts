import { test, expect } from "@playwright/test";
import { prepararReporte } from "../helpers/reportes-fixture";
import {
  tiposReporte,
  REPORTES_TRIBUTARIOS,
} from "../../src/shared/reportes-tributarios";
test("tres reportes: vista previa, guardar, exportar, recargar y permisos", async ({
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
    for (const tipo of tiposReporte) {
      const c = REPORTES_TRIBUTARIOS[tipo];
      await page.goto("/reportes/" + c.ruta);
      await expect(
        page.getByRole("region", { name: "Vista previa de " + c.titulo }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "Página 1 de " + c.titulo }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Exportar PDF" }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Generar reporte", exact: true })
        .click();
      await page.getByRole("button", { name: "Confirmar generación" }).click();
      await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
      for (const formato of ["CSV", "PDF"]) {
        const descarga = page.waitForEvent("download");
        await page.getByRole("button", { name: "Exportar " + formato }).click();
        const archivo = await descarga;
        expect(archivo.suggestedFilename()).toBe(
          c.ruta + "-2026-11." + formato.toLowerCase(),
        );
        if (formato === "PDF")
          await archivo.saveAs("test-results/" + c.ruta + ".pdf");
      }
      await page.reload();
      await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Generar reporte", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Siguiente", exact: true })
        .click();
      await expect(
        page.getByRole("img", { name: "Página 2 de " + c.titulo }),
      ).toBeVisible();
      await page.screenshot({
        path: "test-results/" + c.ruta + ".png",
        fullPage: true,
      });
    }
    expect(await f.db.reporteTributario.count()).toBe(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    const view = await f.db.permiso.findUniqueOrThrow({
      where: { codigo: "IGSS_LABOR_REPORT.VIEW" },
    });
    const rol = await f.db.rol.create({
      data: {
        codigo: f.prefijo + "_solo",
        nombre: "Solo IGSS",
        permisos: { create: { permisoId: view.id } },
      },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id },
    });
    await page.goto("/reportes");
    await expect(
      page.getByRole("link", { name: "Abrir IGSS laboral" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Abrir ISR", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Abrir IGSS laboral" }).click();
    await expect(page.getByText(/Reporte #\d+ guardado/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Exportar PDF" }),
    ).toHaveCount(0);
    await page.goto("/reportes/isr");
    await expect(page).toHaveURL(/sin-acceso/);
  } finally {
    await f.db.$disconnect();
  }
});
