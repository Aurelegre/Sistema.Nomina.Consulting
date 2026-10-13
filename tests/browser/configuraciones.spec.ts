import { test, expect } from "@playwright/test";
import { prepararNomina } from "../helpers/nomina-fixture";
test("configuración dinámica, edición modal y permisos", async ({
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
    await page.goto("/configuracion");
    await expect(
      page.getByRole("heading", { name: "Configuraciones", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Editar Bonificación incentivo (Q)",
        exact: true,
      })
      .click();
    await page.getByLabel("Valor", { exact: true }).fill("275");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Configuración actualizada.",
    );
    expect(
      (
        await f.db.configuracion.findUniqueOrThrow({
          where: { clave: "bonificacion" },
        })
      ).valor,
    ).toBe("275");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    const rol = await f.db.rol.create({
      data: { codigo: f.prefijo, nombre: f.prefijo },
    });
    const permiso = await f.db.permiso.findUniqueOrThrow({
      where: { codigo: "SETTINGS.VIEW" },
    });
    await f.db.rolPermiso.create({
      data: { rolId: rol.id, permisoId: permiso.id },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id },
    });
    await page.reload();
    await expect(
      page.getByText("Bonificación incentivo (Q)", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
    await f.db.rolPermiso.deleteMany({ where: { rolId: rol.id } });
    await page.reload();
    await expect(page).toHaveURL("/sin-acceso");
  } finally {
    await f.db.$disconnect();
  }
});
