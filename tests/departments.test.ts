import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  prepararDepartamentos,
  DEPARTAMENTOS_INICIALES,
} from "../prisma/departamentos-iniciales";
import { createCaller } from "../src/server/api/root";
import {
  listarDepartamentos,
  editarDepartamento,
} from "../src/server/departamentos/departamentos.service";
import {
  cookieSesion,
  obtenerSesion,
} from "../src/server/sesion/Helpers/sesion.helper";

void test("departamentos: catálogo, permisos, validaciones y concurrencia", async (t) => {
  const db = new PrismaClient();
  const prefix = `test_dept_${randomBytes(6).toString("hex")}`;
  async function cuenta(sufijo: string, codigos: string[]) {
    const rol = await db.rol.create({
      data: {
        codigo: `${prefix}_${sufijo}`,
        nombre: `${prefix}_${sufijo}`,
        permisos: {
          create: codigos.map((codigo) => ({
            permiso: { connect: { codigo } },
          })),
        },
      },
    });
    const usuario = await db.usuario.create({
      data: {
        username: `${prefix}_${sufijo}`,
        nombre: sufijo,
        rolId: rol.id,
        passwordHash: "fixture-sin-login",
        debeCambiarPassword: false,
      },
    });
    const token = randomBytes(32).toString("hex");
    const { createHash } = await import("node:crypto");
    const sesion = await db.sesion.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        fechaExpiracion: new Date(Date.now() + 3600000),
      },
    });
    const headers = new Headers({ cookie: cookieSesion(token) });
    const caller = createCaller({
      db,
      headers,
      responseHeaders: new Headers(),
      sesion: await obtenerSesion(db, headers),
    });
    return {
      actor: { usuarioId: usuario.id, sesionId: sesion.id },
      caller,
      rolId: rol.id,
    };
  }

  try {
    const editor = await cuenta("editor", [
      "DEPARTMENTS.VIEW",
      "DEPARTMENTS.MANAGE",
    ]);
    const lector = await cuenta("lector", ["DEPARTMENTS.VIEW"]);
    const ninguno = await cuenta("ninguno", []);
    const soloGestion = await cuenta("gestion", ["DEPARTMENTS.MANAGE"]);
    const lista = await editor.caller.departamentos.listar();
    const original = lista.find(
      (departamento) => departamento.codigo === "FINANZAS",
    )!;
    const entrada = {
      id: original.id,
      version: original.version,
      nombre: original.nombre,
      cuentaContable: "TEST-001.02",
    };

    await t.test(
      "cinco departamentos estables y consultas protegidas",
      async () => {
        assert.deepEqual(
          lista.map((d) => d.codigo).sort(),
          DEPARTAMENTOS_INICIALES.map((d) => d.codigo).sort(),
        );
        assert.equal((await lector.caller.departamentos.listar()).length, 5);
        const anonimo = createCaller({
          db,
          headers: new Headers(),
          responseHeaders: new Headers(),
          sesion: null,
        });
        await assert.rejects(anonimo.departamentos.listar(), {
          code: "UNAUTHORIZED",
        });
        await assert.rejects(anonimo.departamentos.editar(entrada), {
          code: "UNAUTHORIZED",
        });
        await assert.rejects(ninguno.caller.departamentos.listar(), {
          code: "FORBIDDEN",
        });
        await assert.rejects(soloGestion.caller.departamentos.listar(), {
          code: "FORBIDDEN",
        });
        await assert.rejects(lector.caller.departamentos.editar(entrada), {
          code: "FORBIDDEN",
        });
        await assert.rejects(editarDepartamento(db, lector.actor, entrada), {
          code: "FORBIDDEN",
        });
      },
    );

    await t.test(
      "entrada estricta, vacíos, longitudes y registros inexistentes",
      async () => {
        for (const input of [
          { ...entrada, codigo: "MERCADEO" },
          { ...entrada, nombre: "   " },
          { ...entrada, cuentaContable: "  " },
          { ...entrada, cuentaContable: "A".repeat(51) },
          { ...entrada, cuentaContable: "A\nB" },
          { ...entrada, nombre: "A".repeat(101) },
          { ...entrada, cuentaContable: null },
          { ...entrada, version: 0 },
        ]) {
          await assert.rejects(
            editor.caller.departamentos.editar(input as typeof entrada),
            { code: "BAD_REQUEST" },
          );
        }
        await assert.rejects(
          editor.caller.departamentos.editar({ ...entrada, id: 2147483647 }),
          { code: "NOT_FOUND" },
        );
        const otro = lista.find((d) => d.id !== original.id)!;
        await assert.rejects(
          editor.caller.departamentos.editar({
            ...entrada,
            nombre: otro.nombre.toUpperCase(),
          }),
          { code: "CONFLICT" },
        );
      },
    );

    await t.test(
      "normalización y seed repetible conservan lo configurado",
      async () => {
        const rollback = new Error("rollback de la prueba");
        try {
          await db.$transaction(
            async (tx) => {
              await editarDepartamento(tx, editor.actor, {
                ...entrada,
                nombre: `  Finanzas   ${prefix}  `,
                cuentaContable: "  001.02-03  ",
              });
              const guardado = await tx.departamento.findUniqueOrThrow({
                where: { id: original.id },
              });
              assert.equal(guardado.nombre, `Finanzas ${prefix}`);
              assert.equal(guardado.cuentaContable, "001.02-03");
              assert.equal(guardado.codigo, original.codigo);
              assert.equal(guardado.version, original.version + 1);
              await prepararDepartamentos(tx);
              await prepararDepartamentos(tx);
              assert.deepEqual(
                await tx.departamento.findUnique({
                  where: { id: original.id },
                }),
                guardado,
              );
              assert.equal(await tx.departamento.count(), 5);
              throw rollback;
            },
            { timeout: 30000 },
          );
        } catch (error) {
          if (error !== rollback) throw error;
        }
      },
    );

    await t.test(
      "dos escrituras simultáneas aceptan una sola versión",
      async () => {
        const resultados = await Promise.allSettled([
          editor.caller.departamentos.editar({
            ...entrada,
            cuentaContable: `${prefix}-A`,
          }),
          editor.caller.departamentos.editar({
            ...entrada,
            cuentaContable: `${prefix}-B`,
          }),
        ]);
        try {
          assert.equal(
            resultados.filter((r) => r.status === "fulfilled").length,
            1,
          );
          const fallo = resultados.find((r) => r.status === "rejected");
          assert.ok(fallo?.status === "rejected");
          assert.equal((fallo.reason as { code: string }).code, "CONFLICT");
          const actual = await db.departamento.findUniqueOrThrow({
            where: { id: original.id },
          });
          assert.equal(actual.version, original.version + 1);
          assert.ok(
            [`${prefix}-A`, `${prefix}-B`].includes(actual.cuentaContable!),
          );
        } finally {
          // Restaurar únicamente la escritura de esta prueba, sin pisar cambios ajenos.
          await db.departamento.updateMany({
            where: {
              id: original.id,
              version: { in: [original.version + 1, original.version + 2] },
              cuentaContable: { in: [`${prefix}-A`, `${prefix}-B`] },
            },
            data: {
              nombre: original.nombre,
              cuentaContable: original.cuentaContable,
              version: { increment: 1 },
            },
          });
        }
      },
    );

    await t.test(
      "un contexto capturado no conserva permisos ni sesiones revocadas",
      async () => {
        await db.rolPermiso.deleteMany({ where: { rolId: editor.rolId } });
        await assert.rejects(editor.caller.departamentos.listar(), {
          code: "FORBIDDEN",
        });
        await assert.rejects(editor.caller.departamentos.editar(entrada), {
          code: "FORBIDDEN",
        });
        await db.sesion.delete({ where: { id: lector.actor.sesionId } });
        await assert.rejects(lector.caller.departamentos.listar(), {
          code: "UNAUTHORIZED",
        });
        await assert.rejects(listarDepartamentos(db, lector.actor), {
          code: "UNAUTHORIZED",
        });
      },
    );
  } finally {
    await db.usuario.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    await db.rol.deleteMany({ where: { codigo: { startsWith: prefix } } });
    await db.$disconnect();
  }
});
