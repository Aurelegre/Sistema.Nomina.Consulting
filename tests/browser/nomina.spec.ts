import { test, expect } from "@playwright/test";
import { prepararNomina } from "../helpers/nomina-fixture";
import { ejecutarPendientes } from "../../src/server/nomina/nomina.worker";

test("generación, cierre, aviso al navegar, CSV y Mi Nómina", async ({
  page,
  context,
  browser,
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
    await expect(
      page.getByRole("button", { name: "Generar nómina", exact: true }),
    ).toBeEnabled();
    await page.waitForLoadState("networkidle");
    const consultas: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/trpc/nomina."))
        consultas.push(request.url());
    });
    // Observe longer than the previous five-second polling interval.
    await page.waitForTimeout(6500);
    expect(consultas).toHaveLength(0);
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
    expect(
      (
        await f.db.periodoNomina.findUniqueOrThrow({
          where: { id: f.periodo.id },
        })
      ).estado,
    ).toBe("PROCESANDO");
    const otroContexto = await browser.newContext();
    await otroContexto.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    const otraPagina = await otroContexto.newPage();
    await otraPagina.goto("/nomina");
    await expect(
      otraPagina.getByRole("button", { name: "Generar nómina", exact: true }),
    ).toBeVisible();
    await otraPagina.waitForLoadState("networkidle");
    const ajenas: string[] = [];
    otraPagina.on("request", (request) => {
      if (request.url().includes("/api/trpc/nomina."))
        ajenas.push(request.url());
    });
    await page.waitForLoadState("networkidle");
    consultas.length = 0;
    await page.waitForTimeout(6500);
    expect(ajenas).toHaveLength(0);
    expect(consultas.length).toBeGreaterThan(0);
    expect(consultas.every((url) => url.includes("nomina.seguimiento"))).toBe(
      true,
    );
    await otroContexto.close();
    await page.goto("/empleados");
    await ejecutarPendientes(f.db);
    await expect(
      page.getByText("Nómina generada · noviembre de 2026"),
    ).toBeVisible();
    consultas.length = 0;
    await page.waitForTimeout(6500);
    expect(consultas).toHaveLength(0);
    await page
      .getByRole("button", { name: "Recargar página de Nómina" })
      .click();
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
    await page.setViewportSize({ width: 1280, height: 900 });
    await f.db.periodoNomina.create({ data: { mes: 12, anio: 2026 } });
    await page.goto("/nomina");
    await page
      .getByRole("button", { name: "Generar nómina", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar generación" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "quedó en cola" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/login/);
    consultas.length = 0;
    await ejecutarPendientes(f.db);
    await page.waitForTimeout(6500);
    expect(consultas).toHaveLength(0);
    // A new login for the same user must not restore the old notification.
    const { randomBytes } = await import("node:crypto");
    const { digest } =
      await import("../../src/server/sesion/Helpers/sesion.helper");
    const token = randomBytes(32).toString("hex");
    await f.db.sesion.create({
      data: {
        usuarioId: f.usuario.id,
        tokenHash: digest(token),
        fechaExpiracion: new Date(Date.now() + 3600000),
      },
    });
    await context.addCookies([
      { name: "nomina_session", value: token, domain: "localhost", path: "/" },
    ]);
    await page.goto("/mi-nomina");
    await expect(
      page.getByRole("button", { name: "Detalle", exact: true }).first(),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    consultas.length = 0;
    await page.waitForTimeout(6500);
    expect(consultas).toHaveLength(0);
    await expect(
      page.getByRole("button", { name: "Entendido", exact: true }),
    ).toHaveCount(0);
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
