import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { prepararCumpleaneros } from "./helpers/cumpleaneros-fixture";
import {
  listarCumpleaneros as listar,
  exportarCumpleaneros as exportar,
  contextoCumpleaneros,
} from "../src/server/cumpleaneros/cumpleaneros.service";
import { pdfCumpleaneros } from "../src/server/cumpleaneros/Helpers/cumpleaneros-pdf";
void test("cumpleañeros: filtros, datos actuales, privacidad y permisos", async (t) => {
  const f = await prepararCumpleaneros(),
    { db, actor } = f;
  try {
    await t.test(
      "mes Guatemala, sin periodo, activos y orden por día/nombre",
      async () => {
        assert.equal(await db.periodoNomina.count(), 0);
        const ctx = await contextoCumpleaneros(db, actor);
        assert.equal(
          ctx.mes,
          Number(
            new Intl.DateTimeFormat("en-US", {
              month: "numeric",
              timeZone: "America/Guatemala",
            }).format(new Date()),
          ),
        );
        assert.ok(ctx.departamentos.some((d) => d.id === f.otro.id));
        const r = await listar(db, actor, { mes: 2 });
        assert.equal(r.total, 2);
        assert.deepEqual(
          r.filas.map((e) => e.nombre),
          ["Ana de prueba", "Zoe de prueba"],
        );
        assert.deepEqual(Object.keys(r.filas[0]!).sort(), [
          "codigo",
          "departamento",
          "dia",
          "nombre",
        ]);
      },
    );
    await t.test(
      "inactivos, todos, febrero bisiesto, departamentos y vacío",
      async () => {
        assert.equal(
          (await listar(db, actor, { mes: 2, estado: "INACTIVO" })).filas[0]
            ?.dia,
          29,
        );
        assert.equal(
          (await listar(db, actor, { mes: 2, estado: "TODOS" })).total,
          3,
        );
        assert.equal(
          (await listar(db, actor, { mes: 2, departamentoId: f.otro.id }))
            .total,
          1,
        );
        assert.equal((await listar(db, actor, { mes: 12 })).total, 0);
        await assert.rejects(listar(db, actor, { mes: 13 }), /filtros/);
        await assert.rejects(
          listar(db, actor, { mes: 2, departamentoId: 9999999 }),
          /no existe/,
        );
      },
    );
    await t.test(
      "consulta datos vigentes; CSV y PDF con los mismos filtros",
      async () => {
        await db.empleado.update({
          where: { id: f.ana.id },
          data: { nombre: 'Ana, "actual"' },
        });
        const input = {
          mes: 2,
          estado: "TODOS",
          departamentoId: f.departamento.id,
        };
        const r = await listar(db, actor, input);
        assert.equal(r.total, 2);
        const csv = Buffer.from(
          (await exportar(db, actor, { ...input, formato: "csv" })).base64,
          "base64",
        ).toString("utf8");
        assert.ok(csv.includes('Ana, ""actual""'));
        assert.ok(csv.includes("29/02"));
        assert.ok(!csv.includes("Zoe de prueba"));
        assert.ok(!csv.includes("2000"));
        const pdf = await exportar(db, actor, { ...input, formato: "pdf" });
        assert.equal(
          Buffer.from(pdf.base64, "base64").subarray(0, 5).toString(),
          "%PDF-",
        );
        await mkdir("test-results/cumpleaneros", { recursive: true });
        await writeFile(
          "test-results/cumpleaneros/reporte.pdf",
          Buffer.from(pdf.base64, "base64"),
        );
        // Varias páginas y textos largos: revisar saltos, cabeceras y pies.
        const filas = Array.from({ length: 60 }, (_, i) => ({
          ...r.filas[0]!,
          codigo: "CODIGO-" + i,
          nombre:
            "Empleado con nombre extenso para validar saltos de página " + i,
          departamento: "Departamento de operaciones y administración general",
          dia: (i % 28) + 1,
        }));
        await writeFile(
          "test-results/cumpleaneros/multipagina.pdf",
          await pdfCumpleaneros({ ...r, filas, total: filas.length }),
        );
      },
    );
    await t.test(
      "VIEW no exporta; EXPORT requiere VIEW; revocación",
      async () => {
        const rol = await db.rol.create({
          data: { codigo: f.prefijo + "_lector", nombre: "Lector cumpleaños" },
        });
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { rolId: rol.id },
        });
        await assert.rejects(contextoCumpleaneros(db, actor), /permiso/);
        const view = await db.permiso.findUniqueOrThrow({
          where: { codigo: "BIRTHDAYS_REPORT.VIEW" },
        });
        const exp = await db.permiso.findUniqueOrThrow({
          where: { codigo: "BIRTHDAYS_REPORT.EXPORT" },
        });
        await db.rolPermiso.create({
          data: { rolId: rol.id, permisoId: view.id },
        });
        assert.equal((await listar(db, actor, { mes: 2 })).total, 2);
        await assert.rejects(
          exportar(db, actor, { mes: 2, formato: "pdf" }),
          /permiso/,
        );
        await db.rolPermiso.create({
          data: { rolId: rol.id, permisoId: exp.id },
        });
        assert.ok(
          (await exportar(db, actor, { mes: 2, formato: "csv" })).base64,
        );
        await db.rolPermiso.delete({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: view.id } },
        });
        await assert.rejects(
          exportar(db, actor, { mes: 2, formato: "csv" }),
          /permiso/,
        );
      },
    );
  } finally {
    await db.$disconnect();
  }
});
