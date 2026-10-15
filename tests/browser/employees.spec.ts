import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../../src/server/sesion/Helpers/password";

const db = new PrismaClient();
const prefix = `ui_emp_${randomBytes(5).toString("hex")}`;
const codigo = prefix.toUpperCase();
const password = randomBytes(24).toString("base64url");
let departamentoId: number;
let inactivoId: number;
test.beforeAll(async () => {
  departamentoId = (
    await db.departamento.create({
      data: { codigo, nombre: prefix, cuentaContable: "001" },
    })
  ).id;
  inactivoId = (
    await db.departamento.create({
      data: {
        codigo: `${codigo}_OFF`,
        nombre: `${prefix}_off`,
        estado: "INACTIVO",
        cuentaContable: "002",
      },
    })
  ).id;
  for (const [sufijo, permisos] of [
    [
      "editor",
      [
        "EMPLOYEES.VIEW",
        "EMPLOYEES.CREATE",
        "EMPLOYEES.UPDATE",
        "DEPARTMENTS.MANAGE",
      ],
    ],
    ["lector", ["EMPLOYEES.VIEW"]],
    ["ninguno", []],
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
    await db.usuario.create({
      data: {
        username: `${prefix}_${sufijo}`,
        nombre: sufijo,
        passwordHash: await hashPassword(password),
        debeCambiarPassword: false,
        rolId: rol.id,
      },
    });
  }
});
test.afterAll(async () => {
  await db.departamento.updateMany({
    where: { codigo: { startsWith: codigo } },
    data: { jefeId: null },
  });
  await db.empleado.deleteMany({ where: { codigo: { startsWith: codigo } } });
  await db.departamento.deleteMany({
    where: { codigo: { startsWith: codigo } },
  });
  await db.usuario.deleteMany({ where: { username: { startsWith: prefix } } });
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
  await page.goto("/empleados");
}
const mutation = (page: Page, ruta: string, json: unknown) =>
  page.request.post(`/api/trpc/${ruta}`, {
    headers: { Origin: "http://localhost:3100" },
    data: { json },
  });

test("empleados: ciclo completo, conflictos, fechas y departamentos", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, "editor");
  await page
    .getByRole("button", { name: "Crear empleado", exact: true })
    .click();
  let modal = page.getByRole("dialog", { name: "Crear empleado" });
  await modal.getByLabel("Nombre completo").fill("Descartado");
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await page
    .getByRole("button", { name: "Crear empleado", exact: true })
    .click();
  await expect(modal.getByLabel("Nombre completo")).toHaveValue("");
  await modal.getByLabel("Código", { exact: true }).fill(codigo);
  await modal.getByLabel("Nombre completo").fill(`Empleado ${prefix}`);
  await modal.getByLabel("Fecha de nacimiento").fill("1995-05-12");
  await modal.getByLabel("Fecha de ingreso").fill("2020-01-15");
  await modal.getByLabel("Salario base mensual (Q)").fill("4500.50");
  await modal
    .getByRole("combobox", { name: "Departamento", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: `${prefix}_off`, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: prefix, exact: true }).click();
  await modal.getByRole("button", { name: "Guardar empleado" }).click();
  await expect(modal).not.toBeVisible();
  await page.getByLabel("Buscar empleados").fill(codigo);
  const fila = page.getByRole("row").filter({ hasText: codigo });
  await expect(fila).toContainText("4,500.50");
  let empleado = await db.empleado.findUniqueOrThrow({ where: { codigo } });
  expect(empleado.departamentoId).toBe(departamentoId);
  await fila.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("12/05/1995");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await fila.getByRole("button", { name: "Editar", exact: true }).click();
  modal = page.getByRole("dialog", { name: "Editar empleado" });
  await expect(modal.getByLabel("Código", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  // Simula otra edición confirmada mientras este formulario mantiene la versión anterior.
  await db.empleado.update({
    where: { id: empleado.id },
    data: { salarioBase: "4600.75", version: { increment: 1 } },
  });
  await modal.getByLabel("Salario base mensual (Q)").fill("4800.25");
  await modal.getByRole("button", { name: "Guardar empleado" }).click();
  await expect(modal.getByText(/El empleado cambió/)).toBeVisible();
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await fila.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(modal.getByLabel("Salario base mensual (Q)")).toHaveValue(
    "4600.75",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/empleados-editor-mobile.png",
    fullPage: true,
  });
  await modal.getByLabel("Salario base mensual (Q)").fill("4800.25");
  await modal.getByRole("button", { name: "Guardar empleado" }).click();
  await expect(modal).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 800 });
  await fila.getByRole("button", { name: "Dar de baja", exact: true }).click();
  const confirmar = page.getByRole("alertdialog");
  await confirmar.getByRole("button", { name: "Cancelar" }).click();
  await expect(fila.getByText("Activo", { exact: true })).toBeVisible();
  await fila.getByRole("button", { name: "Dar de baja", exact: true }).click();
  await confirmar.getByLabel("Fecha de salida").fill("2019-01-01");
  await confirmar
    .getByRole("button", { name: "Dar de baja al empleado" })
    .click();
  await expect(confirmar.getByText(/no puede ser anterior/)).toBeVisible();
  await confirmar.getByLabel("Fecha de salida").fill("2026-08-31");
  await confirmar
    .getByRole("button", { name: "Dar de baja al empleado" })
    .click();
  await expect(confirmar).not.toBeVisible();
  empleado = await db.empleado.findUniqueOrThrow({ where: { codigo } });
  expect(empleado.fechaSalida?.toISOString().slice(0, 10)).toBe("2026-08-31");
  await page.reload();
  await page.getByLabel("Buscar empleados").fill(codigo);
  await expect(fila.getByText("Inactivo", { exact: true })).toBeVisible();
  await fila.getByRole("button", { name: "Recontratar", exact: true }).click();
  await confirmar.getByRole("button", { name: "Recontratar empleado" }).click();
  await expect(confirmar).not.toBeVisible();
  await expect(fila.getByText("Activo", { exact: true })).toBeVisible();
  empleado = await db.empleado.findUniqueOrThrow({ where: { codigo } });
  expect(empleado.fechaSalida).toBeNull();
  expect(empleado.salarioBase.toFixed(2)).toBe("4800.25");
  const base = {
    codigo: `${codigo}_NEW`,
    nombre: prefix,
    fechaNacimiento: "1990-01-01",
    fechaIngreso: "2020-01-01",
    salarioBase: 4000,
    departamentoId,
  };
  expect(
    (await mutation(page, "empleados.crear", { ...base, codigo })).status(),
  ).toBe(409);
  expect(
    (
      await mutation(page, "empleados.crear", {
        ...base,
        departamentoId: inactivoId,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await mutation(page, "departamentos.desactivar", {
        id: departamentoId,
        version: 1,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await mutation(page, "departamentos.crear", {
        codigo: `${codigo}_D`,
        nombre: `${prefix}_D`,
        cuentaContable: "003",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await mutation(page, "departamentos.crear", {
        codigo: `${codigo}_D`,
        nombre: `${prefix}_D`,
        cuentaContable: "003",
        jefeId: empleado.id,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await mutation(page, "empleados.despedir", {
        id: empleado.id,
        version: empleado.version,
        fechaSalida: "2026-09-01",
      })
    ).status(),
  ).toBe(400);
  await page.screenshot({
    path: "test-results/empleados-listado.png",
    fullPage: true,
  });
});

test("empleados: consulta y operaciones protegidas por permisos", async ({
  page,
}) => {
  await login(page, "lector");
  await expect(
    page.getByRole("heading", { name: "Empleados", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /^(Crear empleado|Editar|Dar de baja|Recontratar)$/,
    }),
  ).toHaveCount(0);
  for (const accion of ["crear", "editar", "despedir", "recontratar"])
    expect((await mutation(page, `empleados.${accion}`, {})).status()).toBe(
      403,
    );
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "ninguno");
  await expect(page).toHaveURL(/\/sin-acceso$/);
  expect(
    (await page.request.get("/api/trpc/empleados.departamentos")).status(),
  ).toBe(403);
});

test("empleados: filtros, paginación y asignación concurrente", async ({
  page,
}) => {
  await db.empleado.createMany({
    data: Array.from({ length: 17 }, (_, i) => ({
      codigo: `${codigo}_P${i}`,
      nombre: `${prefix} paginado ${String(i).padStart(2, "0")}`,
      fechaNacimiento: new Date("1990-01-01"),
      fechaIngreso: new Date("2022-02-01"),
      salarioBase: 3000,
      departamentoId,
      estado: i === 16 ? ("INACTIVO" as const) : ("ACTIVO" as const),
    })),
  });
  await login(page, "editor");
  await page.getByLabel("Buscar empleados").fill(`${prefix} paginado`);
  await expect(page.getByRole("row")).toHaveCount(16);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Filtrar estado" }).click();
  await page.getByRole("option", { name: "Inactivos", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByText(/Página 1 de 1/)).toBeVisible();
  await page.getByLabel("Ingreso desde", { exact: true }).fill("2023-01-01");
  await expect(page.getByText("No se encontraron empleados.")).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Filtrar departamento" }).click();
  await page
    .getByRole("option", { name: `${prefix}_off`, exact: true })
    .click();
  await expect(page.getByText("No se encontraron empleados.")).toBeVisible();
  await db.departamento.update({
    where: { id: inactivoId },
    data: { estado: "ACTIVO" },
  });
  const resultados = await Promise.all([
    mutation(page, "empleados.crear", {
      codigo: `${codigo}_RACE`,
      nombre: prefix,
      fechaNacimiento: "1990-01-01",
      fechaIngreso: "2020-01-01",
      salarioBase: 4000,
      departamentoId: inactivoId,
    }),
    mutation(page, "departamentos.desactivar", { id: inactivoId, version: 1 }),
  ]);
  expect(resultados.map((r) => r.status()).sort()).toEqual([200, 400]);
  const destino = await db.departamento.findUniqueOrThrow({
    where: { id: inactivoId },
    include: { empleados: true },
  });
  expect(destino.estado === "ACTIVO" || destino.empleados.length === 0).toBe(
    true,
  );
});
