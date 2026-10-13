import { test, expect } from "@playwright/test";
import { prepararNomina } from "../helpers/nomina-fixture";
test("cambio personal sin permisos, validaciones y nuevo inicio de sesión", async ({
  page,
  context,
}) => {
  const f = await prepararNomina();
  try {
    const rol = await f.db.rol.create({
      data: { codigo: f.prefijo + "_sin", nombre: "Sin permisos" },
    });
    await f.db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id, empleadoId: null },
    });
    await context.addCookies([
      {
        name: "nomina_session",
        value: f.token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/");
    await page
      .getByRole("link", { name: "Cambiar contraseña", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cambiar mi contraseña", exact: true })
      .click();
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill(f.password);
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("Una nueva clave de prueba 123");
    await page
      .getByLabel("Confirmar nueva contraseña", { exact: true })
      .fill("No coincide con la nueva");
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .click();
    await expect(
      page.getByText("Las contraseñas no coinciden", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Confirmar nueva contraseña", { exact: true })
      .fill("Una nueva clave de prueba 123");
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill("Contraseña incorrecta");
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .click();
    await expect(
      page.getByText("La contraseña actual no es correcta", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill(f.password);
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .click();
    await expect(
      page.getByText("Contraseña actualizada. Tus sesiones se cerraron.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await f.db.sesion.count({ where: { usuarioId: f.usuario.id } }),
    ).toBe(0);
    expect(
      (await context.cookies()).some((c) => c.name === "nomina_session"),
    ).toBe(false);
    await page.getByRole("button", { name: "Ir a iniciar sesión" }).click();
    await page.getByLabel("Usuario", { exact: true }).fill(f.usuario.username);
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Una nueva clave de prueba 123");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL("/");
  } finally {
    await f.db.$disconnect();
  }
});
