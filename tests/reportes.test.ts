import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { prepararReporte } from "./helpers/reportes-fixture";
import {
  vistaPreviaPoliza,
  generarPoliza,
  exportarPoliza,
  contextoReportes,
} from "../src/server/reportes/reportes.service";
import { agruparPoliza } from "../src/server/reportes/Helpers/poliza.helper";

void test("póliza histórica, permisos, concurrencia y exportaciones", async (t) => {
  const f = await prepararReporte();
  const { db, actor, periodo } = f;
  const input = { periodoId: periodo.id };
  try {
    let previa = await vistaPreviaPoliza(db, actor, input);
    await t.test(
      "agrupa valores guardados sin recalcular; cuentas nuevas en cero",
      async () => {
        assert.equal(previa.datos.totales.totalIngresos, "6250.00");
        assert.equal(previa.datos.totales.anticipo, "3000.00");
        assert.ok(Number(previa.datos.totales.pagoFinal) < 0);
        await db.departamento.update({
          where: { id: f.departamento.id },
          data: {
            cuentaContable: "009-NUEVA",
            nombre: 'Nuevo "nombre", después',
          },
        });
        const cambio = await vistaPreviaPoliza(db, actor, input);
        assert.equal(
          cambio.datos.grupos.find((g) => g.cuenta === "009-NUEVA")?.importes
            .totalIngresos,
          "0.00",
        );
        assert.equal(
          cambio.datos.grupos.find((g) => g.cuenta === "001-5101")?.importes
            .totalIngresos,
          "6250.00",
        );
        await assert.rejects(
          generarPoliza(db, actor, { ...input, huella: previa.huella }),
          /configuración cambió/,
        );
        previa = cambio;
        assert.equal(await db.reportePoliza.count(), 0);
      },
    );
    await t.test(
      "cuenta histórica ausente conserva importes; misma cuenta conserva departamentos",
      async () => {
        const detalles = await db.detalleNomina.findMany({
          where: { nominaId: previa.datos.nominaId },
        });
        const d = detalles[0]!;
        const datos = agruparPoliza(
          periodo,
          d.nominaId,
          [{ ...d, cuentaContable: null }],
          [
            {
              id: f.departamento.id,
              nombre: "Actual",
              cuentaContable: "NUEVA",
            },
          ],
        );
        assert.equal(
          datos.grupos.find((g) => g.cuenta === null)?.importes.totalIngresos,
          "6250.00",
        );
        assert.equal(
          datos.grupos.find((g) => g.cuenta === "NUEVA")?.importes
            .totalIngresos,
          "0.00",
        );
        const compartida = agruparPoliza(
          periodo,
          d.nominaId,
          [d, { ...d, departamento: "Otro", entrada: { departamentoId: 999 } }],
          [],
        );
        assert.equal(compartida.grupos.length, 2);
        assert.equal(compartida.cuentas.length, 1);
        assert.equal(compartida.cuentas[0]?.importes.totalIngresos, "12500.00");
      },
    );
    await t.test(
      "una sola fila ante generación simultánea y carga del reporte guardado",
      async () => {
        const r = await Promise.all([
          generarPoliza(db, actor, { ...input, huella: previa.huella }),
          generarPoliza(db, actor, { ...input, huella: previa.huella }),
        ]);
        assert.equal(r[0].id, r[1].id);
        assert.equal(await db.reportePoliza.count(), 1);
        await db.departamento.update({
          where: { id: f.departamento.id },
          data: { cuentaContable: "OTRA-POSTERIOR" },
        });
        await db.empleado.update({
          where: { id: f.empleado.id },
          data: { salarioBase: 12000 },
        });
        const guardado = await vistaPreviaPoliza(db, actor, input);
        assert.deepEqual(guardado.datos, previa.datos);
        assert.equal(guardado.reporteId, r[0].id);
        assert.ok(guardado.fechaGeneracion);
        previa = guardado;
        assert.equal(
          (await contextoReportes(db, actor)).periodos[0]?.nomina?.reportePoliza
            ?.id,
          r[0].id,
        );
      },
    );
    await t.test(
      "CSV conserva signo, Unicode y escape; PDF coincide con vista previa",
      async () => {
        const csv = await exportarPoliza(db, actor, {
          ...input,
          formato: "csv",
        });
        const contenido = Buffer.from(csv.base64, "base64").toString("utf8");
        assert.ok(contenido.startsWith("\uFEFF"));
        assert.match(contenido, /Anticipo Quincenal/);
        assert.ok(contenido.includes(previa.datos.totales.pagoFinal));
        assert.match(contenido, /Nuevo ""nombre"", después/);
        const pdf = await exportarPoliza(db, actor, {
          ...input,
          formato: "pdf",
        });
        assert.equal(
          Buffer.from(pdf.base64, "base64").subarray(0, 5).toString(),
          "%PDF-",
        );
        assert.equal(pdf.base64, previa.pdf);
        await mkdir("test-results/reportes", { recursive: true });
        await writeFile(
          "test-results/reportes/poliza.pdf",
          Buffer.from(pdf.base64, "base64"),
        );
      },
    );
    await t.test("no admite período abierto ni nómina incompleta", async () => {
      const p = await db.periodoNomina.create({
        data: { mes: 12, anio: 2026 },
      });
      await assert.rejects(
        vistaPreviaPoliza(db, actor, { periodoId: p.id }),
        /nómina completada/,
      );
      await assert.rejects(
        generarPoliza(db, actor, { periodoId: p.id, huella: previa.huella }),
        /nómina completada/,
      );
      await assert.rejects(
        exportarPoliza(db, actor, { periodoId: p.id, formato: "pdf" }),
        /Genera el reporte/,
      );
    });
    await t.test(
      "permisos independientes: solo consulta, exportación y usuario sin acceso",
      async () => {
        const rol = await db.rol.create({
          data: { codigo: `${f.prefijo}_view`, nombre: `${f.prefijo}_view` },
        });
        const permisos = await db.permiso.findMany({
          where: {
            codigo: {
              in: ["ACCOUNTING_POLICY.VIEW", "ACCOUNTING_POLICY.EXPORT"],
            },
          },
        });
        const view = permisos.find((p) => p.codigo.endsWith(".VIEW"))!;
        const exp = permisos.find((p) => p.codigo.endsWith(".EXPORT"))!;
        await db.rolPermiso.create({
          data: { rolId: rol.id, permisoId: view.id },
        });
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { rolId: rol.id },
        });
        assert.ok((await vistaPreviaPoliza(db, actor, input)).reporteId);
        await assert.rejects(
          generarPoliza(db, actor, { ...input, huella: previa.huella }),
          /permiso/,
        );
        await assert.rejects(
          exportarPoliza(db, actor, { ...input, formato: "csv" }),
          /permiso/,
        );
        await db.rolPermiso.create({
          data: { rolId: rol.id, permisoId: exp.id },
        });
        assert.ok(
          (await exportarPoliza(db, actor, { ...input, formato: "pdf" }))
            .base64,
        );
        await db.rolPermiso.delete({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: view.id } },
        });
        await assert.rejects(vistaPreviaPoliza(db, actor, input), /permiso/);
        await assert.rejects(
          exportarPoliza(db, actor, { ...input, formato: "pdf" }),
          /permiso/,
        );
        await db.sesion.delete({ where: { id: actor.sesionId } });
        await assert.rejects(contextoReportes(db, actor));
      },
    );
  } finally {
    await db.$disconnect();
  }
});
