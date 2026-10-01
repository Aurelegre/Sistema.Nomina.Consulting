import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { TRPCError } from "@trpc/server";
import { prepararNovedades } from "./helpers/novedades-fixture";
import {
  contextoNovedades,
  detalleEmpleadoDepartamento,
  listarEmpleadosDepartamento,
  registrarNovedad,
} from "../src/server/novedades/novedades.service";
import { registrarNovedadSchema } from "../src/server/novedades/Models/novedades.schema";
import { cerrarPeriodoNomina } from "../src/server/Periodo-Nomina/periodos-nomina.service";
import { tipoAdmitidoEnDepartamento } from "../src/server/novedades/Helpers/tipo-novedad.helper";

void test("piezas y ventas corresponden exclusivamente al código de su departamento", () => {
  for (const codigo of [
    "PRODUCCION",
    "MERCADEO",
    "FINANZAS",
    "LOGISTICA",
    "RECURSOS_HUMANOS",
    "OTRO",
  ]) {
    assert.equal(
      tipoAdmitidoEnDepartamento("PIEZAS", codigo),
      codigo === "PRODUCCION",
    );
    assert.equal(
      tipoAdmitidoEnDepartamento("VENTAS", codigo),
      codigo === "MERCADEO",
    );
    assert.equal(tipoAdmitidoEnDepartamento("HORAS_EXTRAS", codigo), true);
    assert.equal(tipoAdmitidoEnDepartamento("HORAS_DOBLES", codigo), true);
  }
});

void test("novedades: ámbito, permisos, acumulación, reintentos y cierre", async (t) => {
  const f = await prepararNovedades();
  const entrada = (cantidad = "1.25") => ({
    solicitudId: randomUUID(),
    empleadoId: f.trabajador.id,
    periodoId: f.periodo.id,
    tipo: "HORAS_EXTRAS" as const,
    cantidad,
  });
  const denegado = (code: string) => (error: unknown) =>
    error instanceof TRPCError && error.code === code;
  try {
    await t.test(
      "listado y detalle solo del departamento; detalle tiene permiso independiente",
      async () => {
        const lista = await listarEmpleadosDepartamento(f.db, f.actor, {});
        assert.equal(lista.total, 2);
        assert.ok(!lista.filas.some((e) => e.id === f.externo.id));
        assert.equal(
          (
            await detalleEmpleadoDepartamento(f.db, f.actor, {
              empleadoId: f.trabajador.id,
            })
          ).salarioBase,
          "4000.00",
        );
        await assert.rejects(
          detalleEmpleadoDepartamento(f.db, f.actor, {
            empleadoId: f.externo.id,
          }),
          denegado("NOT_FOUND"),
        );
        const permiso = await f.db.permiso.findUniqueOrThrow({
          where: { codigo: "DEPARTMENT_EMPLOYEES.DETAIL" },
        });
        await f.db.rolPermiso.delete({
          where: {
            rolId_permisoId: { rolId: f.rol.id, permisoId: permiso.id },
          },
        });
        await assert.rejects(
          detalleEmpleadoDepartamento(f.db, f.actor, {
            empleadoId: f.trabajador.id,
          }),
          denegado("FORBIDDEN"),
        );
        assert.equal(
          (await listarEmpleadosDepartamento(f.db, f.actor, {})).total,
          2,
        );
      },
    );
    await t.test("cantidades válidas y piezas enteras", () => {
      for (const cantidad of ["0", "-1", "1.234", "NaN", "1e3", "10000000000"])
        assert.equal(
          registrarNovedadSchema.safeParse(entrada(cantidad)).success,
          false,
        );
      assert.equal(
        registrarNovedadSchema.safeParse({ ...entrada("1.5"), tipo: "PIEZAS" })
          .success,
        false,
      );
      assert.equal(
        registrarNovedadSchema.safeParse({ ...entrada("100"), tipo: "PIEZAS" })
          .success,
        true,
      );
    });
    await t.test(
      "acumula concurrentemente, separa tipo y período, reintento no duplica",
      async () => {
        const solicitud = entrada();
        const [a, b] = await Promise.all([
          registrarNovedad(f.db, f.actor, solicitud),
          registrarNovedad(f.db, f.actor, solicitud),
        ]);
        assert.equal(a.id, b.id);
        await Promise.all([
          registrarNovedad(f.db, f.actor, entrada("2.50")),
          registrarNovedad(f.db, f.actor, entrada("0.25")),
        ]);
        await registrarNovedad(f.db, f.actor, {
          ...entrada("3"),
          tipo: "HORAS_DOBLES",
        });
        // Histórico independiente; ya no pueden coexistir dos períodos abiertos.
        await f.db.novedadNomina.create({
          data: {
            ...entrada("9"),
            periodoId: f.segundo.id,
            departamentoId: f.departamento.id,
            usuarioId: f.usuario.id,
          },
        });
        const lista = await listarEmpleadosDepartamento(f.db, f.actor, {
          periodoId: f.periodo.id,
        });
        const e = lista.filas.find((e) => e.id === f.trabajador.id)!;
        assert.equal(e.acumulados.HORAS_EXTRAS, "4.00");
        assert.equal(e.acumulados.HORAS_DOBLES, "3.00");
        await assert.rejects(
          registrarNovedad(f.db, f.actor, { ...solicitud, cantidad: "5" }),
          denegado("CONFLICT"),
        );
      },
    );
    await t.test(
      "rechaza empleado ajeno, inactivo y tipos de otro departamento",
      async () => {
        await assert.rejects(
          registrarNovedad(f.db, f.actor, {
            ...entrada(),
            empleadoId: f.externo.id,
          }),
          denegado("NOT_FOUND"),
        );
        for (const tipo of ["PIEZAS", "VENTAS"] as const)
          await assert.rejects(
            registrarNovedad(f.db, f.actor, { ...entrada("2"), tipo }),
            denegado("FORBIDDEN"),
          );
        await f.db.empleado.update({
          where: { id: f.trabajador.id },
          data: { estado: "INACTIVO" },
        });
        await assert.rejects(
          registrarNovedad(f.db, f.actor, entrada()),
          denegado("NOT_FOUND"),
        );
        await f.db.empleado.update({
          where: { id: f.trabajador.id },
          data: { estado: "ACTIVO" },
        });
      },
    );
    await t.test(
      "permiso de acción requerido y jefatura vigente sin bypass",
      async () => {
        const permiso = await f.db.permiso.findUniqueOrThrow({
          where: { codigo: "PAYROLL_NEWS.OVERTIME" },
        });
        await f.db.rolPermiso.delete({
          where: {
            rolId_permisoId: { rolId: f.rol.id, permisoId: permiso.id },
          },
        });
        await assert.rejects(
          registrarNovedad(f.db, f.actor, entrada()),
          denegado("FORBIDDEN"),
        );
        await f.db.rolPermiso.create({
          data: { rolId: f.rol.id, permisoId: permiso.id },
        });
        await f.db.departamento.update({
          where: { id: f.departamento.id },
          data: { jefeId: null },
        });
        await assert.rejects(
          contextoNovedades(f.db, f.actor),
          denegado("FORBIDDEN"),
        );
        await assert.rejects(
          registrarNovedad(f.db, f.actor, entrada()),
          denegado("FORBIDDEN"),
        );
        await f.db.departamento.update({
          where: { id: f.departamento.id },
          data: { jefeId: f.jefe.id },
        });
      },
    );
    await t.test("cierre coordinado y consulta posterior", async () => {
      const resultados = await Promise.allSettled([
        cerrarPeriodoNomina(f.db, f.periodo.id),
        registrarNovedad(f.db, f.actor, entrada()),
      ]);
      assert.equal(resultados[0].status, "fulfilled");
      await assert.rejects(
        registrarNovedad(f.db, f.actor, entrada()),
        denegado("BAD_REQUEST"),
      );
      assert.equal(
        (
          await listarEmpleadosDepartamento(f.db, f.actor, {
            periodoId: f.periodo.id,
          })
        ).total,
        2,
      );
    });
  } finally {
    await f.limpiar();
  }
});
