import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, randomBytes } from "node:crypto";
import { prepararNomina } from "./helpers/nomina-fixture";
import {
  solicitarNomina,
  detalleNomina,
  listarNominas,
  exportarNomina,
  seguimientoNomina,
} from "../src/server/nomina/nomina.service";
import { ejecutarPendientes } from "../src/server/nomina/nomina.worker";
import {
  crearCompra,
  editarCompra,
  eliminarCompra,
} from "../src/server/compras-solidarias/compras-solidarias.service";
import { registrarNovedad } from "../src/server/novedades/novedades.service";
import { comprobarMesAbierto } from "../src/server/ausencias/Helpers/ausencias.helper";
import { digest } from "../src/server/sesion/Helpers/sesion.helper";
import { appRouter } from "../src/server/api/root";
import { celdaCsv } from "../src/server/nomina/Helpers/csv.helper";

void test("generación transaccional de nómina en MySQL", async (t) => {
  const f = await prepararNomina();
  const { db, actor, periodo, empleado, usuario } = f;
  try {
    const compra = (monto: string) =>
      crearCompra(db, actor, {
        periodoId: periodo.id,
        empleadoId: empleado.id,
        monto,
        detalle: "Alimentos",
      });
    const primeraCompra = await compra("100");
    await compra("50.25");
    for (const [tipo, cantidad] of [
      ["HORAS_EXTRAS", 2],
      ["HORAS_DOBLES", 1],
      ["PIEZAS", 100],
    ] as const)
      await db.novedadNomina.create({
        data: {
          solicitudId: randomUUID(),
          empleadoId: empleado.id,
          periodoId: periodo.id,
          departamentoId: f.departamento.id,
          usuarioId: usuario.id,
          tipo,
          cantidad,
        },
      });
    for (const [inicio, fin] of [
      ["2026-11-10", "2026-11-11"],
      ["2026-11-11", "2026-11-12"],
    ])
      await db.ausencia.create({
        data: {
          empleadoId: empleado.id,
          departamentoId: f.departamento.id,
          fechaInicio: new Date(inicio!),
          fechaFin: new Date(fin!),
          motivo: "Prueba",
          estado: "APROBADA",
          aCuentaSalario: true,
        },
      });
    const baja = await db.empleado.create({
      data: {
        codigo: `${f.prefijo}_baja`,
        nombre: "Empleado de baja",
        estado: "INACTIVO",
        salarioBase: 6000,
        fechaIngreso: new Date("2020-01-01"),
        fechaSalida: new Date("2026-11-15"),
        fechaNacimiento: new Date("1990-01-01"),
        departamentoId: f.departamento.id,
      },
    });
    await db.compraSolidaria.create({
      data: {
        empleadoId: baja.id,
        periodoId: periodo.id,
        usuarioRegistroId: usuario.id,
        monto: 5000,
        detalle: "Compra anterior a baja",
      },
    });
    const limites = [
      "100000",
      "100000.01",
      "200000",
      "200000.01",
      "400000",
      "400000.01",
    ];
    const vendedores: number[] = [];
    for (const [i, ventas] of limites.entries()) {
      const e = await db.empleado.create({
        data: {
          codigo: `${f.prefijo}_${i}`,
          nombre: `Vendedor ${i}`,
          salarioBase: 6000,
          fechaIngreso: new Date("2020-01-01"),
          fechaNacimiento: new Date("1990-01-01"),
          departamentoId: f.departamento.id,
        },
      });
      await db.novedadNomina.create({
        data: {
          solicitudId: randomUUID(),
          empleadoId: e.id,
          periodoId: periodo.id,
          departamentoId: f.departamento.id,
          usuarioId: usuario.id,
          tipo: "VENTAS",
          cantidad: ventas,
        },
      });
      vendedores.push(e.id);
    }
    let id = 0;
    await t.test(
      "dos solicitudes simultáneas producen una sola ejecución",
      async () => {
        const resultados = await Promise.allSettled([
          solicitarNomina(db, actor, { periodoId: periodo.id }),
          solicitarNomina(db, actor, { periodoId: periodo.id }),
        ]);
        assert.equal(
          resultados.filter((r) => r.status === "fulfilled").length,
          1,
        );
        id = (
          await db.nomina.findUniqueOrThrow({
            where: { periodoId: periodo.id },
          })
        ).id;
      },
    );
    await t.test(
      "bloqueo de movimientos y copia consistente del salario",
      async () => {
        await assert.rejects(compra("1"));
        const registro = await db.compraSolidaria.findUniqueOrThrow({
          where: { id: primeraCompra.id },
        });
        await assert.rejects(
          editarCompra(db, actor, {
            id: registro.id,
            version: registro.version,
            monto: "200",
            detalle: "Edición bloqueada",
          }),
        );
        await assert.rejects(
          eliminarCompra(db, actor, {
            id: registro.id,
            version: registro.version,
          }),
        );
        await db.departamento.update({
          where: { id: f.departamento.id },
          data: { jefeId: empleado.id },
        });
        await assert.rejects(
          registrarNovedad(db, actor, {
            solicitudId: randomUUID(),
            empleadoId: empleado.id,
            periodoId: periodo.id,
            tipo: "HORAS_EXTRAS",
            cantidad: "1",
          }),
          /período abierto/,
        );
        assert.equal(
          (
            await db.periodoNomina.findUniqueOrThrow({
              where: { id: periodo.id },
            })
          ).estado,
          "PROCESANDO",
        );
        await assert.rejects(
          db.periodoNomina.create({ data: { mes: 12, anio: 2026 } }),
        );
        assert.equal(
          (await seguimientoNomina(db, actor, { id })).estado,
          "PENDIENTE",
        );
        await assert.rejects(comprobarMesAbierto(db, new Date("2026-11-15")));
        await db.empleado.update({
          where: { id: empleado.id },
          data: { salarioBase: 9000 },
        });
        await assert.rejects(detalleNomina(db, actor, { id }));
      },
    );
    await t.test(
      "SP completo, totales exactos, ausencias sin duplicar y cierre",
      async () => {
        await Promise.all([ejecutarPendientes(db), ejecutarPendientes(db)]);
        const n = await db.nomina.findUniqueOrThrow({
          where: { id },
          include: { detalles: true, periodo: true },
        });
        assert.equal(n.estado, "COMPLETADA");
        assert.equal(n.periodo.estado, "CERRADO");
        assert.ok(n.periodo.fechaCierre);
        const d = n.detalles.find((d) => d.empleadoId === empleado.id)!;
        assert.equal(d.salarioBase.toFixed(2), "6000.00");
        assert.equal(d.diasAusencia, 3);
        assert.equal(d.diasLaborados, 27);
        assert.equal(d.salarioDevengado.toFixed(2), "5400.00");
        assert.equal(d.totalIngresos.toFixed(2), "5776.00");
        assert.equal(d.compras.toFixed(2), "150.25");
        assert.equal(d.igssLaboral.toFixed(2), "266.91");
        assert.equal(d.isr.toFixed(2), "91.41");
        assert.equal(d.pagoFinal.toFixed(2), "2087.43");
        assert.equal(
          n.totalPago.toFixed(2),
          n.detalles
            .reduce((s, d) => s.plus(d.pagoFinal), n.totalPago.mul(0))
            .toFixed(2),
        );
        assert.equal(
          await db.ausencia.count({
            where: { empleadoId: empleado.id, estado: "APLICADA_NOMINA" },
          }),
          2,
        );
        const b = n.detalles.find((d) => d.empleadoId === baja.id)!;
        assert.equal(b.salarioDevengado.toFixed(2), "3000.00");
        assert.equal(b.igssLaboral.toFixed(2), "144.90");
        assert.equal(b.isr.toFixed(2), "85.41");
        assert.equal(b.pagoFinal.toFixed(2), "-5160.31");
        assert.deepEqual(
          vendedores.map((e) =>
            n.detalles.find((d) => d.empleadoId === e)!.tasaComision.toFixed(4),
          ),
          ["0.0000", "0.0250", "0.0250", "0.0350", "0.0350", "0.0450"],
        );
        await db.$executeRaw`CALL sp_generar_nomina(${id})`;
        assert.equal(
          await db.detalleNomina.count({ where: { nominaId: id } }),
          8,
        );
        await assert.rejects(
          solicitarNomina(db, actor, { periodoId: periodo.id }),
        );
        await assert.rejects(compra("1"));
      },
    );
    await t.test(
      "consulta propia, permisos independientes y seguimiento limitado a la sesión solicitante",
      async () => {
        const rol = await db.rol.create({
          data: {
            codigo: randomBytes(8).toString("hex"),
            nombre: randomBytes(8).toString("hex"),
          },
        });
        await db.usuario.update({
          where: { id: usuario.id },
          data: { rolId: rol.id },
        });
        const propias = await listarNominas(db, actor, {}, true);
        assert.equal(propias.filas[0]?.cantidad, 1);
        assert.equal(propias.filas[0]?.totalPago, "2087.43");
        assert.equal((await detalleNomina(db, actor, { id }, true)).total, 1);
        await assert.rejects(listarNominas(db, actor, {}));
        await assert.rejects(detalleNomina(db, actor, { id }));
        await assert.rejects(exportarNomina(db, actor, { id }));
        const sinEmpleado = await db.usuario.create({
          data: {
            username: randomBytes(8).toString("hex"),
            nombre: "Otro usuario",
            passwordHash: "no-login",
            rolId: rol.id,
          },
        });
        const sesion = await db.sesion.create({
          data: {
            usuarioId: sinEmpleado.id,
            tokenHash: digest(randomBytes(32).toString("hex")),
            fechaExpiracion: new Date(Date.now() + 3600000),
          },
        });
        await assert.rejects(
          detalleNomina(
            db,
            { usuarioId: sinEmpleado.id, sesionId: sesion.id },
            { id },
            true,
          ),
        );
        assert.equal(
          (await seguimientoNomina(db, actor, { id })).estado,
          "COMPLETADA",
        );
        await assert.rejects(
          seguimientoNomina(
            db,
            { usuarioId: sinEmpleado.id, sesionId: sesion.id },
            { id },
          ),
        );
        const otraSesion = await db.sesion.create({
          data: {
            usuarioId: usuario.id,
            tokenHash: digest(randomBytes(32).toString("hex")),
            fechaExpiracion: new Date(Date.now() + 3600000),
          },
        });
        await assert.rejects(
          seguimientoNomina(db, { ...actor, sesionId: otraSesion.id }, { id }),
        );
        await db.sesion.delete({ where: { id: otraSesion.id } });
        await assert.rejects(
          seguimientoNomina(db, { ...actor, sesionId: otraSesion.id }, { id }),
        );
        await db.rolPermiso.create({
          data: {
            rolId: rol.id,
            permisoId: (
              await db.permiso.findUniqueOrThrow({
                where: { codigo: "PAYROLL.EXPORT" },
              })
            ).id,
          },
        });
        assert.match(
          (await exportarNomina(db, actor, { id })).contenido,
          /-5160.31/,
        );
        assert.equal(celdaCsv("=CMD()", true), '"\'=CMD()"');
        assert.equal(celdaCsv("-15.25"), '"-15.25"');
        await db.usuario.update({
          where: { id: usuario.id },
          data: { rolId: f.usuario.rolId },
        });
      },
    );
    await t.test(
      "fallo revierte cálculo, libera período y admite reintento",
      async () => {
        const p = await db.periodoNomina.create({
          data: { mes: 12, anio: 2026 },
        });
        const n = await solicitarNomina(db, actor, { periodoId: p.id });
        await db.nomina.update({ where: { id: n.id }, data: { reglas: {} } });
        await ejecutarPendientes(db);
        assert.equal(
          (await db.nomina.findUniqueOrThrow({ where: { id: n.id } })).estado,
          "FALLIDA",
        );
        const abierto = await db.periodoNomina.findUniqueOrThrow({
          where: { id: p.id },
        });
        assert.equal(abierto.estado, "ABIERTO");
        assert.equal(
          await db.detalleNomina.count({
            where: { nominaId: n.id, totalIngresos: { not: 0 } },
          }),
          0,
        );
        await solicitarNomina(db, actor, { periodoId: p.id });
        // Simulates a worker killed after claim; another worker resumes the durable input.
        await db.nomina.update({
          where: { id: n.id },
          data: { estado: "EN_PROCESO" },
        });
        await ejecutarPendientes(db);
        assert.equal(
          (await db.nomina.findUniqueOrThrow({ where: { id: n.id } })).estado,
          "COMPLETADA",
        );
        const filtradas = await listarNominas(
          db,
          actor,
          { desde: "2026-12", hasta: "2026-12" },
          true,
        );
        assert.equal(filtradas.total, 1);
      },
    );
    await t.test("mes informativo y días comerciales de febrero", async () => {
      const result = await db.$transaction(async (tx) => {
        await tx.$executeRaw`CALL sp_obtener_mes_actual(@nombre_mes)`;
        return tx.$queryRaw<{ mes: string }[]>`SELECT @nombre_mes mes`;
      });
      assert.equal(
        result[0]?.mes,
        new Intl.DateTimeFormat("es-GT", {
          month: "long",
          timeZone: "America/Guatemala",
        }).format(new Date()),
      );
      const p = await db.periodoNomina.create({ data: { mes: 2, anio: 2026 } });
      await db.ausencia.create({
        data: {
          empleadoId: empleado.id,
          departamentoId: f.departamento.id,
          fechaInicio: new Date("2026-02-01"),
          fechaFin: new Date("2026-02-28"),
          motivo: "Mes completo",
          estado: "APROBADA",
          aCuentaSalario: true,
        },
      });
      const n = await solicitarNomina(db, actor, { periodoId: p.id });
      await ejecutarPendientes(db);
      const d = await db.detalleNomina.findUniqueOrThrow({
        where: {
          nominaId_empleadoId: { nominaId: n.id, empleadoId: empleado.id },
        },
      });
      assert.equal(d.diasLaborados, 0);
      assert.equal(d.diasAusencia, 30);
      assert.equal(d.salarioDevengado.toFixed(2), "0.00");
      assert.equal("periodosNomina.cerrar" in appRouter._def.procedures, false);
    });
  } finally {
    await db.$disconnect();
  }
});
