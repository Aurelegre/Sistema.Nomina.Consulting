import assert from "node:assert/strict";
import { test } from "node:test";
import { TRPCError } from "@trpc/server";
import { prepararCompras } from "./helpers/compras-fixture";
import {
  contextoCompras,
  crearCompra,
  editarCompra,
  eliminarCompra,
  empleadosCompra,
  listarCompras,
} from "../src/server/compras-solidarias/compras-solidarias.service";
import { acumuladosComprasPeriodo } from "../src/server/compras-solidarias/Helpers/acumulados-compra.helper";
import {
  crearPeriodoNomina,
  cerrarPeriodoNomina,
} from "../src/server/Periodo-Nomina/periodos-nomina.service";
import {
  crearCompraSchema,
  editarCompraSchema,
} from "../src/server/compras-solidarias/Models/compras-solidarias.schema";
import { createCaller } from "../src/server/api/root";
import {
  obtenerSesion,
  cookieSesion,
} from "../src/server/sesion/Helpers/sesion.helper";

void test("compras solidarias y único período abierto", async (t) => {
  const f = await prepararCompras();
  const entrada = () => ({
    empleadoId: f.empleado.id,
    periodoId: f.periodo.id,
    monto: "75.25",
    detalle: "Compra de alimentos",
  });
  const codigo = (code: string) => (e: unknown) =>
    e instanceof TRPCError && e.code === code;
  try {
    await t.test(
      "validación estricta y sin campos de cuotas ni solicitud",
      () => {
        for (const monto of ["0", "-1", "1.001", "NaN", "1e2", "10000000000"])
          assert.equal(
            crearCompraSchema.safeParse({ ...entrada(), monto }).success,
            false,
          );
        assert.equal(
          crearCompraSchema.safeParse({ ...entrada(), detalle: "   " }).success,
          false,
        );
        assert.equal(
          crearCompraSchema.safeParse({ ...entrada(), solicitudId: "extra" })
            .success,
          false,
        );
        assert.equal(
          editarCompraSchema.safeParse({
            id: 1,
            version: 1,
            monto: "10",
            detalle: "x",
            empleadoId: f.otro.id,
          }).success,
          false,
        );
      },
    );
    await t.test(
      "acumulación exacta, autor, registros independientes y filtros",
      async () => {
        const a = await crearCompra(f.db, f.actor, entrada());
        const b = await crearCompra(f.db, f.actor, entrada());
        assert.notEqual(a.id, b.id);
        const actual = await f.db.compraSolidaria.findUniqueOrThrow({
          where: { id: a.id },
        });
        assert.equal(actual.usuarioRegistroId, f.usuario.id);
        assert.equal(actual.periodoId, f.periodo.id);
        await crearCompra(f.db, f.actor, {
          ...entrada(),
          empleadoId: f.otro.id,
          monto: "20.10",
          detalle: "Otra compra",
        });
        assert.equal((await contextoCompras(f.db, f.actor)).activo?.anio, 2091);
        assert.equal(
          (await listarCompras(f.db, f.actor, {})).montoTotal,
          "170.60",
        );
        assert.equal(
          (await listarCompras(f.db, f.actor, { empleadoId: f.empleado.id }))
            .montoTotal,
          "150.50",
        );
        assert.equal(
          (await listarCompras(f.db, f.actor, { busqueda: "Otra" })).total,
          1,
        );
        assert.equal(
          (await listarCompras(f.db, f.actor, { periodoId: f.historico.id }))
            .total,
          0,
        );
        const acumulados = await acumuladosComprasPeriodo(f.db, f.periodo.id);
        assert.equal(
          acumulados
            .find((x) => x.empleadoId === f.empleado.id)
            ?._sum.monto?.toFixed(2),
          "150.50",
        );
      },
    );
    await t.test(
      "no crea a inactivos; permite corregir compra existente sin moverla",
      async () => {
        await f.db.empleado.update({
          where: { id: f.empleado.id },
          data: { estado: "INACTIVO" },
        });
        await assert.rejects(
          crearCompra(f.db, f.actor, entrada()),
          codigo("BAD_REQUEST"),
        );
        assert.equal(
          (await empleadosCompra(f.db, f.actor, {}, true)).filas.some(
            (e) => e.id === f.empleado.id,
          ),
          false,
        );
        assert.equal(
          (await empleadosCompra(f.db, f.actor, {}, false)).filas.some(
            (e) => e.id === f.empleado.id,
          ),
          true,
        );
        const compra = await f.db.compraSolidaria.findFirstOrThrow({
          where: { empleadoId: f.empleado.id },
        });
        await editarCompra(f.db, f.actor, {
          id: compra.id,
          version: compra.version,
          monto: "10.50",
          detalle: "Corrección",
        });
        const editada = await f.db.compraSolidaria.findUniqueOrThrow({
          where: { id: compra.id },
        });
        assert.equal(editada.usuarioRegistroId, compra.usuarioRegistroId);
        assert.equal(
          editada.fechaRegistro.getTime(),
          compra.fechaRegistro.getTime(),
        );
        assert.equal(editada.usuarioActualizacionId, f.usuario.id);
        assert.equal(editada.periodoId, compra.periodoId);
        await assert.rejects(
          eliminarCompra(f.db, f.actor, {
            id: compra.id,
            version: compra.version,
          }),
          codigo("CONFLICT"),
        );
        await eliminarCompra(f.db, f.actor, {
          id: editada.id,
          version: editada.version,
        });
        await f.db.empleado.update({
          where: { id: f.empleado.id },
          data: { estado: "ACTIVO" },
        });
      },
    );
    await t.test(
      "permisos independientes en servicio y router con sesión obsoleta",
      async () => {
        const headers = new Headers({ cookie: cookieSesion(f.token) });
        const sesion = await obtenerSesion(f.db, headers);
        assert.ok(sesion);
        const caller = createCaller({
          db: f.db,
          headers,
          responseHeaders: new Headers(),
          sesion,
        });
        for (const [permiso, operacion] of [
          [
            "ASSOCIATION.PURCHASES.CREATE",
            () => caller.comprasSolidarias.crear(entrada()),
          ],
          [
            "ASSOCIATION.PURCHASES.VIEW",
            () => listarCompras(f.db, f.actor, {}),
          ],
          [
            "ASSOCIATION.PURCHASES.UPDATE",
            () =>
              editarCompra(f.db, f.actor, {
                id: 999999,
                version: 1,
                monto: "1",
                detalle: "x",
              }),
          ],
          [
            "ASSOCIATION.PURCHASES.DELETE",
            () => eliminarCompra(f.db, f.actor, { id: 999999, version: 1 }),
          ],
        ] as const) {
          const p = await f.db.permiso.findUniqueOrThrow({
            where: { codigo: permiso },
          });
          await f.db.rolPermiso.delete({
            where: { rolId_permisoId: { rolId: f.rol.id, permisoId: p.id } },
          });
          await assert.rejects(operacion(), codigo("FORBIDDEN"));
          await f.db.rolPermiso.create({
            data: { rolId: f.rol.id, permisoId: p.id },
          });
        }
      },
    );
    await t.test("ediciones simultáneas no se sobrescriben", async () => {
      const compra = await f.db.compraSolidaria.findFirstOrThrow();
      const cambios = await Promise.allSettled(
        ["21.00", "22.00"].map((monto) =>
          editarCompra(f.db, f.actor, {
            id: compra.id,
            version: compra.version,
            monto,
            detalle: "Concurrente",
          }),
        ),
      );
      assert.equal(cambios.filter((r) => r.status === "fulfilled").length, 1);
    });
    await t.test(
      "unicidad en servicio y BD; cierre coordinado con todas las escrituras",
      async () => {
        await assert.rejects(
          crearPeriodoNomina(f.db, { mes: 2, anio: 2091 }),
          codigo("CONFLICT"),
        );
        await assert.rejects(
          f.db.periodoNomina.create({ data: { mes: 3, anio: 2091 } }),
        );
        const compra = await f.db.compraSolidaria.findFirstOrThrow();
        const carrera = await Promise.allSettled([
          cerrarPeriodoNomina(f.db, f.periodo.id),
          crearCompra(f.db, f.actor, entrada()),
          editarCompra(f.db, f.actor, {
            id: compra.id,
            version: compra.version,
            monto: "15",
            detalle: "Cierre",
          }),
          eliminarCompra(f.db, f.actor, {
            id: compra.id,
            version: compra.version,
          }),
        ]);
        assert.equal(carrera[0].status, "fulfilled");
        assert.equal((await contextoCompras(f.db, f.actor)).activo, null);
        const conservada = await f.db.compraSolidaria.findFirstOrThrow();
        await assert.rejects(
          crearCompra(f.db, f.actor, entrada()),
          codigo("PRECONDITION_FAILED"),
        );
        await assert.rejects(
          editarCompra(f.db, f.actor, {
            id: conservada.id,
            version: conservada.version,
            monto: "3",
            detalle: "cerrado",
          }),
          codigo("CONFLICT"),
        );
        await assert.rejects(
          eliminarCompra(f.db, f.actor, {
            id: conservada.id,
            version: conservada.version,
          }),
          codigo("CONFLICT"),
        );
        assert.ok(
          (await listarCompras(f.db, f.actor, { periodoId: f.periodo.id }))
            .total > 0,
        );
        assert.equal((await listarCompras(f.db, f.actor, {})).total, 0);
      },
    );
    await t.test(
      "dos aperturas simultáneas y formulario de período anterior",
      async () => {
        const resultados = await Promise.allSettled(
          [2, 3].map((mes) => crearPeriodoNomina(f.db, { mes, anio: 2091 })),
        );
        assert.equal(
          resultados.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.equal(
          await f.db.periodoNomina.count({ where: { estado: "ABIERTO" } }),
          1,
        );
        await assert.rejects(
          crearCompra(f.db, f.actor, entrada()),
          codigo("CONFLICT"),
        );
      },
    );
  } finally {
    await f.limpiar();
  }
});
