import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { prepararReporte } from "./helpers/reportes-fixture";
import {
  vistaPreviaTributario as previa,
  generarTributario as generar,
  exportarTributario as exportar,
} from "../src/server/reportes/tributario.service";
import { agruparTributario } from "../src/server/reportes/Helpers/tributario.helper";
import {
  tiposReporte,
  REPORTES_TRIBUTARIOS,
} from "../src/shared/reportes-tributarios";
import { Prisma } from "@prisma/client";

void test("reportes tributarios: historia, ceros, permisos y persistencia", async (t) => {
  const f = await prepararReporte(),
    { db, actor, periodo } = f;
  try {
    const detalles = await db.detalleNomina.findMany({
      where: { nomina: { periodoId: periodo.id } },
    });
    const d = detalles[0]!;
    const nuevo = await db.departamento.create({
      data: { codigo: f.prefijo + "_nuevo", nombre: "Departamento nuevo" },
    });
    await t.test(
      "incluye cuotas cero e historia independiente del empleado actual",
      () => {
        for (const tipo of tiposReporte) {
          const cero = {
            ...d,
            empleadoId: 99999,
            codigo: "CERO",
            igssLaboral: new Prisma.Decimal(0),
            igssPatronal: new Prisma.Decimal(0),
            isr: new Prisma.Decimal(0),
          };
          const r = agruparTributario(
            tipo,
            periodo,
            d.nominaId,
            [d, cero],
            [nuevo],
          );
          assert.equal(r.empleados, 2);
          assert.equal(
            r.grupos.find((g) => g.departamentoId === nuevo.id)?.importe,
            "0.00",
          );
          assert.equal(
            r.grupos.flatMap((g) => g.filas).find((e) => e.codigo === "CERO")
              ?.importe,
            "0.00",
          );
        }
      },
    );
    for (const tipo of tiposReporte)
      await t.test(tipo, async () => {
        const input = { tipo, periodoId: periodo.id };
        const p = await previa(db, actor, input);
        assert.equal(p.reporteId, null);
        assert.equal(
          p.datos.importe,
          d[
            tipo === "ISR"
              ? "isr"
              : tipo === "IGSS_LABORAL"
                ? "igssLaboral"
                : "igssPatronal"
          ].toFixed(2),
        );
        assert.equal(
          p.datos.grupos.find((g) => g.departamentoId === nuevo.id)?.base,
          "0.00",
        );
        await assert.rejects(
          exportar(db, actor, { ...input, formato: "csv" }),
          /Genera el reporte/,
        );
        const ids = await Promise.all([
          generar(db, actor, { ...input, huella: p.huella }),
          generar(db, actor, { ...input, huella: p.huella }),
        ]);
        assert.equal(ids[0].id, ids[1].id);
        await db.empleado.update({
          where: { id: f.empleado.id },
          data: { salarioBase: 10000, nombre: "Nombre modificado" },
        });
        const guardado = await previa(db, actor, input);
        assert.deepEqual(guardado.datos, p.datos);
        assert.ok(guardado.fechaGeneracion);
        const pdf = await exportar(db, actor, { ...input, formato: "pdf" });
        assert.equal(pdf.base64, guardado.pdf);
        const csv = Buffer.from(
          (await exportar(db, actor, { ...input, formato: "csv" })).base64,
          "base64",
        ).toString("utf8");
        assert.ok(csv.includes("Departamento nuevo"));
        assert.ok(csv.includes(d.nombre));
        assert.ok(csv.includes(p.datos.importe));
        await mkdir("test-results/tributarios", { recursive: true });
        await writeFile(
          "test-results/tributarios/" + tipo + ".pdf",
          Buffer.from(pdf.base64, "base64"),
        );
      });
    assert.equal(await db.reporteTributario.count(), 3);
    await t.test("periodo abierto no genera reportes", async () => {
      const p = await db.periodoNomina.create({
        data: { mes: 12, anio: 2026 },
      });
      await assert.rejects(
        previa(db, actor, { tipo: "ISR", periodoId: p.id }),
        /completada/,
      );
    });
    await t.test(
      "cada tipo exige sus propios permisos en backend",
      async () => {
        const rol = await db.rol.create({
          data: { codigo: f.prefijo + "_lector", nombre: "Lector de prueba" },
        });
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { rolId: rol.id },
        });
        for (const tipo of tiposReporte) {
          await db.rolPermiso.deleteMany({ where: { rolId: rol.id } });
          const view = await db.permiso.findUniqueOrThrow({
            where: { codigo: REPORTES_TRIBUTARIOS[tipo].permiso + ".VIEW" },
          });
          await db.rolPermiso.create({
            data: { rolId: rol.id, permisoId: view.id },
          });
          const input = { tipo, periodoId: periodo.id },
            p = await previa(db, actor, input);
          assert.ok(p.reporteId);
          await assert.rejects(
            generar(db, actor, { ...input, huella: p.huella }),
            /permiso/,
          );
          await assert.rejects(
            exportar(db, actor, { ...input, formato: "pdf" }),
            /permiso/,
          );
          for (const otro of tiposReporte.filter((v) => v !== tipo))
            await assert.rejects(
              previa(db, actor, { ...input, tipo: otro }),
              /permiso/,
            );
        }
      },
    );
  } finally {
    await db.$disconnect();
  }
});
