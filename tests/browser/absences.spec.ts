import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../../src/server/sesion/Helpers/password";
const db = new PrismaClient();
const prefix = `ui_abs_${randomBytes(5).toString("hex")}`;
const password = randomBytes(24).toString("base64url");
const empleados: Record<string, number> = {};
const departamentos: number[] = [];
async function solicitud(
  sufijo: string,
  motivo: string,
  departamentoId = departamentos[0]!,
) {
  return db.ausencia.create({
    data: {
      empleadoId: empleados[sufijo]!,
      departamentoId,
      motivo,
      fechaInicio: new Date("2088-05-10"),
      fechaFin: new Date("2088-05-12"),
    },
  });
}
test.beforeAll(async () => {
  for (const sufijo of ["a", "b"])
    departamentos.push(
      (
        await db.departamento.create({
          data: {
            codigo: `${prefix}_${sufijo}`,
            nombre: `${prefix}_${sufijo}`,
            cuentaContable: "TEST",
          },
        })
      ).id,
    );
  for (const [sufijo, permisos, destino] of [
    ["empleado", ["ABSENCES.VIEW", "ABSENCES.CREATE"], 0],
    [
      "jefe",
      [
        "ABSENCES.VIEW",
        "ABSENCES.CREATE",
        "ABSENCES.APPROVE",
        "ABSENCES.VIEW_ALL",
      ],
      0,
    ],
    ["otro", ["ABSENCES.VIEW", "ABSENCES.CREATE"], 1],
    ["jefe_lector", ["ABSENCES.VIEW"], 1],
    [
      "sin_empleado",
      [
        "ABSENCES.VIEW",
        "ABSENCES.VIEW_ALL",
        "ABSENCES.CREATE",
        "ABSENCES.APPROVE",
      ],
      -1,
    ],
  ] as const) {
    const rol = await db.rol.create({
      data: {
        codigo: `${prefix}_${sufijo}`,
        nombre: `${prefix}_${sufijo}`,
        permisos: {
          create: permisos.map((codigo) => ({
            permiso: { connect: { codigo } },
          })),
        },
      },
    });
    if (destino >= 0)
      empleados[sufijo] = (
        await db.empleado.create({
          data: {
            codigo: `${prefix}_${sufijo}`,
            nombre: `${prefix} ${sufijo}`,
            departamentoId: departamentos[destino]!,
            salarioBase: 4000,
            fechaNacimiento: new Date("1990-01-01"),
            fechaIngreso: new Date("2020-01-01"),
          },
        })
      ).id;
    await db.usuario.create({
      data: {
        username: `${prefix}_${sufijo}`,
        nombre: sufijo,
        rolId: rol.id,
        passwordHash: await hashPassword(password),
        debeCambiarPassword: false,
        empleadoId: empleados[sufijo],
      },
    });
  }
  await db.departamento.update({
    where: { id: departamentos[0] },
    data: { jefeId: empleados.jefe },
  });
  await db.departamento.update({
    where: { id: departamentos[1] },
    data: { jefeId: empleados.jefe_lector },
  });
});
test.afterAll(async () => {
  await db.ausencia.deleteMany({
    where: { departamentoId: { in: departamentos } },
  });
  await db.departamento.updateMany({
    where: { id: { in: departamentos } },
    data: { jefeId: null },
  });
  await db.usuario.deleteMany({ where: { username: { startsWith: prefix } } });
  await db.empleado.deleteMany({ where: { codigo: { startsWith: prefix } } });
  await db.departamento.deleteMany({ where: { id: { in: departamentos } } });
  await db.intentoLogin.deleteMany({
    where: { username: { startsWith: prefix } },
  });
  await db.rol.deleteMany({ where: { codigo: { startsWith: prefix } } });
  await db.$disconnect();
});
async function login(page: Page, sufijo: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(`${prefix}_${sufijo}`);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/", { timeout: 30000 });
}
async function consultar(page: Page, ruta: string, input: unknown) {
  return page.request.get(
    `/api/trpc/${ruta}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
  );
}

test("historial propio, creación modal, fechas, filtros y paginación", async ({
  page,
}) => {
  test.setTimeout(120000);
  await solicitud("otro", "Ajena", departamentos[1]);
  await login(page, "empleado");
  await page.getByRole("link", { name: "Ausencias", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/ausencias", {
    timeout: 30000,
  });
  await expect(
    page.getByRole("heading", { name: "Mi historial de solicitudes" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: "Revisión del departamento" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("No se encontraron solicitudes con estos filtros."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Crear solicitud", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Crear solicitud de ausencia",
  });
  await modal.getByLabel("Motivo", { exact: true }).fill("Descartado");
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await page
    .getByRole("button", { name: "Crear solicitud", exact: true })
    .click();
  await expect(modal.getByLabel("Motivo", { exact: true })).toHaveValue("");
  await modal.getByLabel("Fecha de inicio").fill("2088-05-31");
  await modal.getByLabel("Fecha de fin").fill("2088-06-01");
  await modal.getByLabel("Motivo", { exact: true }).fill("Solicitud personal");
  await modal.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    modal.getByText("La ausencia debe pertenecer al mismo mes y año"),
  ).toBeVisible();
  await modal.getByLabel("Fecha de fin").fill("2088-05-31");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/ausencias-crear-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await modal.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(modal).not.toBeVisible();
  const fila = page.getByRole("row").filter({ hasText: "Solicitud personal" });
  await expect(fila).toContainText("Pendiente");
  await expect(fila).toContainText("Por definir");
  await fila.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("31/05/2088");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 800 });
  for (let i = 0; i < 16; i++) await solicitud("empleado", `Historial ${i}`);
  await page.getByRole("button", { name: "Actualizar listado" }).click();
  await expect(page.getByRole("row")).toHaveCount(16);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Filtrar estado" }).click();
  await page.getByRole("option", { name: "Aprobada", exact: true }).click();
  await expect(
    page.getByText("No se encontraron solicitudes con estos filtros."),
  ).toBeVisible();
  await expect(page.getByText(/Página 1 de 1/)).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page
    .getByLabel("Solicitud ingresada desde", { exact: true })
    .fill("2080-01-01");
  await expect(
    page.getByText("No se encontraron solicitudes con estos filtros."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("Buscar solicitudes").fill("Solicitud personal");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/ausencias-historial.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("jefe: historial aislado, revisión, filtros, aprobación, rechazo y conflicto", async ({
  page,
}) => {
  test.setTimeout(120000);
  const propia = await solicitud("jefe", "Propia del jefe");
  const aprobar = await solicitud("empleado", "Para aprobar");
  const rechazar = await solicitud("empleado", "Para rechazar");
  const conflicto = await solicitud("empleado", "Conflicto de resolución");
  // Sigue siendo visible para el departamento histórico después del traslado.
  await db.empleado.update({
    where: { id: empleados.empleado },
    data: { departamentoId: departamentos[1] },
  });
  await login(page, "jefe");
  await page.goto("/ausencias");
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(
    page.getByRole("row").filter({ hasText: "Propia del jefe" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Revisión del departamento" }).click();
  await expect(
    page.getByRole("combobox", { name: "Filtrar estado" }),
  ).toContainText("Pendiente");
  await page.getByRole("combobox", { name: "Filtrar empleado" }).click();
  await expect(
    page.getByRole("option", {
      name: `${prefix}_otro · ${prefix} otro`,
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("option", {
      name: `${prefix}_empleado · ${prefix} empleado`,
      exact: true,
    })
    .click();
  await page.getByLabel("Buscar solicitudes").fill("Para aprobar");
  let fila = page.getByRole("row").filter({ hasText: "Para aprobar" });
  await fila.getByRole("button", { name: "Aprobar", exact: true }).click();
  const confirmar = page.getByRole("alertdialog");
  await confirmar.getByRole("button", { name: "Cancelar" }).click();
  await fila.getByRole("button", { name: "Aprobar", exact: true }).click();
  await confirmar.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(
    confirmar.getByText("Indica si la ausencia es a cuenta de salario."),
  ).toBeVisible();
  await confirmar
    .getByRole("combobox", { name: "A cuenta de salario" })
    .click();
  await page.getByRole("option", { name: "Sí", exact: true }).click();
  await confirmar
    .getByLabel("Comentario de resolución (opcional)")
    .fill("Autorizada");
  await confirmar.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(confirmar).not.toBeVisible();
  await expect(fila).toHaveCount(0);
  expect(
    (await db.ausencia.findUniqueOrThrow({ where: { id: aprobar.id } }))
      .aCuentaSalario,
  ).toBe(true);
  await page.getByLabel("Buscar solicitudes").fill("Para rechazar");
  fila = page.getByRole("row").filter({ hasText: "Para rechazar" });
  await fila.getByRole("button", { name: "Rechazar", exact: true }).click();
  await confirmar
    .getByRole("combobox", { name: "A cuenta de salario" })
    .click();
  await page.getByRole("option", { name: "No", exact: true }).click();
  await confirmar.getByRole("button", { name: "Rechazar solicitud" }).click();
  await expect(confirmar).not.toBeVisible();
  expect(
    (await db.ausencia.findUniqueOrThrow({ where: { id: rechazar.id } }))
      .estado,
  ).toBe("RECHAZADA");
  await page.getByLabel("Buscar solicitudes").fill("Conflicto de resolución");
  fila = page.getByRole("row").filter({ hasText: "Conflicto de resolución" });
  await fila.getByRole("button", { name: "Aprobar", exact: true }).click();
  await db.ausencia.update({
    where: { id: conflicto.id },
    data: { estado: "RECHAZADA", version: { increment: 1 } },
  });
  await confirmar
    .getByRole("combobox", { name: "A cuenta de salario" })
    .click();
  await page.getByRole("option", { name: "No", exact: true }).click();
  await confirmar.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(
    confirmar.getByText(/La solicitud cambió o ya fue resuelta/),
  ).toBeVisible();
  await confirmar.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("Buscar solicitudes").fill("Propia del jefe");
  await page
    .getByRole("row")
    .filter({ hasText: "Propia del jefe" })
    .getByRole("button", { name: "Aprobar", exact: true })
    .click();
  await confirmar
    .getByRole("combobox", { name: "A cuenta de salario" })
    .click();
  await page.getByRole("option", { name: "No", exact: true }).click();
  await confirmar.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(confirmar).not.toBeVisible();
  expect(
    (await db.ausencia.findUniqueOrThrow({ where: { id: propia.id } })).estado,
  ).toBe("APROBADA");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("combobox", { name: "Filtrar estado" }).click();
  await page.getByRole("option", { name: "Aprobada", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Propia del jefe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Para aprobar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Aprobar|Rechazar)$/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/ausencias-revision.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("apartados protegidos por vínculo y jefatura, también por URL y API", async ({
  page,
}) => {
  await login(page, "sin_empleado");
  await expect(
    page.getByRole("link", { name: "Ausencias", exact: true }),
  ).toHaveCount(0);
  for (const ruta of ["/ausencias", "/ausencias/revision"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/sin-acceso$/);
  }
  expect(
    (await consultar(page, "ausencias.listar", { ambito: "propias" })).status(),
  ).toBe(403);
  expect(
    (
      await consultar(page, "ausencias.listar", { ambito: "departamento" })
    ).status(),
  ).toBe(403);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "empleado");
  await page.goto("/ausencias/revision");
  await expect(page).toHaveURL(/\/sin-acceso$/);
  expect(
    (
      await consultar(page, "ausencias.listar", { ambito: "departamento" })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.get("/api/trpc/ausencias.empleadosRevision")).status(),
  ).toBe(403);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "jefe_lector");
  await page.goto("/ausencias/revision");
  await expect(
    page.getByRole("heading", {
      name: "Solicitudes del departamento",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Aprobar|Rechazar)$/ }),
  ).toHaveCount(0);
});
