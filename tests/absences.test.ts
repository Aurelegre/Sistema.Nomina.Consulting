import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { seed } from "../prisma/seed";
import { createCaller } from "../src/server/api/root";
import {
  iniciarSesion,
  cambiarPrimeraPassword,
} from "../src/server/sesion/auth.service";
import {
  cookieSesion,
  obtenerSesion,
} from "../src/server/sesion/Helpers/sesion.helper";
import { hashPassword } from "../src/server/sesion/Helpers/password";
import { crearAusencia } from "../src/server/ausencias/ausencias.service";
import { actorVigente } from "../src/server/permisos/Helpers/acceso-policy";
import { crearAusenciaSchema } from "../src/server/ausencias/Models/ausencias.schema";
import type { CodigoPermiso } from "../src/server/permisos/Helpers/permisos";

void test("ausencias: reglas, ámbito, autenticación y concurrencia", async (t) => {
  const db = new PrismaClient();
  const prefix = `abs_${randomBytes(5).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  const departamentos: number[] = [];
  const periodos: number[] = [];
  const entrada = {
    fechaInicio: "2088-05-10",
    fechaFin: "2088-05-12",
    motivo: "Gestión personal",
  };
  async function acceso(username: string, clave = password) {
    const { token } = await iniciarSesion(db, username, clave);
    const headers = new Headers({ cookie: cookieSesion(token) });
    const sesion = await obtenerSesion(db, headers);
    assert.ok(sesion);
    return {
      token,
      headers,
      actor: { usuarioId: sesion.usuario.id, sesionId: sesion.id },
      caller: createCaller({
        db,
        headers,
        responseHeaders: new Headers(),
        sesion,
      }),
    };
  }
  async function cuenta(
    sufijo: string,
    permisos: CodigoPermiso[],
    departamentoId?: number,
  ) {
    const empleado = departamentoId
      ? await db.empleado.create({
          data: {
            codigo: `${prefix}_${sufijo}`,
            nombre: sufijo,
            departamentoId,
            fechaIngreso: new Date("2020-01-01"),
            fechaNacimiento: new Date("1990-01-01"),
            salarioBase: 4000,
          },
        })
      : null;
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
    const usuario = await db.usuario.create({
      data: {
        username: `${prefix}_${sufijo}`,
        nombre: sufijo,
        rolId: rol.id,
        empleadoId: empleado?.id,
        passwordHash: await hashPassword(password),
        debeCambiarPassword: false,
      },
    });
    return { usuario, empleado, rol, ...(await acceso(usuario.username)) };
  }
  try {
    await seed(db, { username: `${prefix}_admin`, password });
    const administrador = await db.usuario.findUniqueOrThrow({
      where: { username: `${prefix}_admin` },
    });
    await cambiarPrimeraPassword(
      db,
      administrador.id,
      password,
      `${password}_new`,
    );
    const admin = await acceso(administrador.username, `${password}_new`);
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
    const [a, b] = departamentos as [number, number];
    const permisos: CodigoPermiso[] = ["ABSENCES.VIEW", "ABSENCES.CREATE"];
    const empleado = await cuenta("empleado", permisos, a);
    const otro = await cuenta("otro", permisos, b);
    const jefe = await cuenta("jefe", [...permisos, "ABSENCES.APPROVE"], a);
    const jefeB = await cuenta("jefe_b", [...permisos, "ABSENCES.APPROVE"], b);
    const sinEmpleado = await cuenta("sin_empleado", [
      ...permisos,
      "ABSENCES.APPROVE",
    ]);
    const sinPermiso = await cuenta("sin_permiso", [], a);
    await db.departamento.update({
      where: { id: a },
      data: { jefeId: jefe.empleado!.id },
    });
    await db.departamento.update({
      where: { id: b },
      data: { jefeId: jefeB.empleado!.id },
    });

    await t.test(
      "fechas estrictas, mes y año, creación propia y campos protegidos",
      async () => {
        for (const fechas of [
          { fechaInicio: "2088-05-12", fechaFin: "2088-05-10" },
          { fechaInicio: "2088-05-31", fechaFin: "2088-06-01" },
          { fechaInicio: "2088-12-31", fechaFin: "2089-01-01" },
          { fechaInicio: "2088-02-30", fechaFin: "2088-02-30" },
          { fechaInicio: "2088-05-10T12:00:00Z", fechaFin: "2088-05-12" },
        ])
          assert.equal(
            crearAusenciaSchema.safeParse({ ...entrada, ...fechas }).success,
            false,
          );
        assert.equal(
          crearAusenciaSchema.safeParse({
            ...entrada,
            fechaInicio: "2088-02-29",
            fechaFin: "2088-02-29",
          }).success,
          true,
        );
        for (const datos of [
          { empleadoId: otro.empleado!.id },
          { departamentoId: b },
          { aCuentaSalario: true },
          { estado: "APROBADA" },
          { usuarioCreacionId: admin.actor.usuarioId },
        ]) {
          await assert.rejects(
            empleado.caller.ausencias.crear({ ...entrada, ...datos }),
            { code: "BAD_REQUEST" },
          );
          await assert.rejects(
            crearAusencia(db, empleado.actor, { ...entrada, ...datos }),
            { code: "BAD_REQUEST" },
          );
        }
        await assert.rejects(sinEmpleado.caller.ausencias.crear(entrada), {
          code: "FORBIDDEN",
        });
        await assert.rejects(admin.caller.ausencias.crear(entrada), {
          code: "FORBIDDEN",
        });
        await assert.rejects(sinPermiso.caller.ausencias.crear(entrada), {
          code: "FORBIDDEN",
        });
        await assert.rejects(
          empleado.caller.ausencias.crear({
            ...entrada,
            fechaInicio: "2019-05-10",
            fechaFin: "2019-05-12",
          }),
          { code: "BAD_REQUEST" },
        );
        const creada = await empleado.caller.ausencias.crear(entrada);
        assert.equal(creada.empleadoId, empleado.empleado!.id);
        assert.equal(creada.departamentoId, a);
        assert.equal(creada.usuarioCreacionId, empleado.usuario.id);
        assert.equal(creada.aCuentaSalario, false);
        assert.equal(creada.estado, "PENDIENTE");
        assert.equal(creada.usuarioResolucionId, null);
      },
    );
    await t.test(
      "consulta propia, departamental y global sin fuga por filtros ni ID",
      async () => {
        const ajena = await otro.caller.ausencias.crear(entrada);
        assert.equal(
          (
            await empleado.caller.ausencias.listar({
              empleadoId: otro.empleado!.id,
            })
          ).total,
          0,
        );
        assert.equal((await sinEmpleado.caller.ausencias.listar({})).total, 0);
        await assert.rejects(
          empleado.caller.ausencias.obtener({ id: ajena.id }),
          { code: "NOT_FOUND" },
        );
        await assert.rejects(jefe.caller.ausencias.obtener({ id: ajena.id }), {
          code: "NOT_FOUND",
        });
        assert.equal(
          (await jefeB.caller.ausencias.obtener({ id: ajena.id })).id,
          ajena.id,
        );
        assert.ok(
          (
            await admin.caller.ausencias.listar({ departamentoId: b })
          ).filas.some((f) => f.id === ajena.id),
        );
        const listado = await jefe.caller.ausencias.listar({ tamano: 1 });
        assert.equal(listado.filas.length, 1);
        assert.ok(listado.filas.every((f) => f.departamentoId === a));
      },
    );
    await t.test(
      "jefatura real, resolución propia y decisión salarial en aprobación y rechazo",
      async () => {
        const solicitud = await empleado.caller.ausencias.crear(entrada);
        const resolucion = {
          id: solicitud.id,
          version: solicitud.version,
          aCuentaSalario: true,
        };
        await assert.rejects(admin.caller.ausencias.aprobar(resolucion), {
          code: "FORBIDDEN",
        });
        await assert.rejects(jefeB.caller.ausencias.aprobar(resolucion), {
          code: "FORBIDDEN",
        });
        await assert.rejects(sinEmpleado.caller.ausencias.aprobar(resolucion), {
          code: "FORBIDDEN",
        });
        const aprobada = await jefe.caller.ausencias.aprobar(resolucion);
        assert.equal(aprobada.estado, "APROBADA");
        assert.equal(aprobada.aCuentaSalario, true);
        assert.equal(aprobada.usuarioResolucionId, jefe.usuario.id);
        assert.ok(aprobada.fechaResolucion);
        await assert.rejects(
          jefe.caller.ausencias.rechazar({
            ...resolucion,
            version: aprobada.version,
          }),
          { code: "CONFLICT" },
        );
        const propia = await jefe.caller.ausencias.crear(entrada);
        assert.equal(
          (
            await jefe.caller.ausencias.aprobar({
              id: propia.id,
              version: propia.version,
              aCuentaSalario: false,
            })
          ).estado,
          "APROBADA",
        );
        const rechazo = await empleado.caller.ausencias.crear(entrada);
        const rechazada = await jefe.caller.ausencias.rechazar({
          id: rechazo.id,
          version: rechazo.version,
          aCuentaSalario: true,
          comentarioResolucion: "No autorizado",
        });
        assert.equal(rechazada.aCuentaSalario, true);
        assert.equal(rechazada.estado, "RECHAZADA");
        assert.equal(rechazada.comentarioResolucion, "No autorizado");
        assert.equal("descuento" in rechazada, false);
      },
    );
    await t.test(
      "traslado conserva departamento y cambio de jefe se consulta al resolver",
      async () => {
        const solicitud = await empleado.caller.ausencias.crear(entrada);
        await admin.caller.empleados.editar({
          id: empleado.empleado!.id,
          version: empleado.empleado!.version,
          nombre: empleado.empleado!.nombre,
          fechaNacimiento: empleado.empleado!.fechaNacimiento,
          fechaIngreso: empleado.empleado!.fechaIngreso,
          salarioBase: 4000,
          departamentoId: b,
        });
        await assert.rejects(
          jefeB.caller.ausencias.aprobar({
            id: solicitud.id,
            version: 1,
            aCuentaSalario: false,
          }),
          { code: "FORBIDDEN" },
        );
        const resuelta = await jefe.caller.ausencias.aprobar({
          id: solicitud.id,
          version: 1,
          aCuentaSalario: false,
        });
        assert.equal(resuelta.departamentoId, a);
        const nueva = await empleado.caller.ausencias.crear(entrada);
        assert.equal(nueva.departamentoId, b);
        await db.departamento.update({
          where: { id: b },
          data: { jefeId: otro.empleado!.id },
        });
        await assert.rejects(
          jefeB.caller.ausencias.aprobar({
            id: nueva.id,
            version: 1,
            aCuentaSalario: false,
          }),
          { code: "FORBIDDEN" },
        );
        await db.departamento.update({
          where: { id: b },
          data: { jefeId: jefeB.empleado!.id },
        });
      },
    );
    await t.test(
      "dos resoluciones simultáneas tienen un solo ganador",
      async () => {
        const solicitud = await otro.caller.ausencias.crear(entrada);
        const data = { id: solicitud.id, version: 1, aCuentaSalario: true };
        const resultados = await Promise.allSettled([
          jefeB.caller.ausencias.aprobar(data),
          jefeB.caller.ausencias.rechazar(data),
        ]);
        assert.equal(
          resultados.filter((r) => r.status === "fulfilled").length,
          1,
        );
        const fallo = resultados.find((r) => r.status === "rejected");
        assert.ok(
          fallo?.status === "rejected" && fallo.reason instanceof TRPCError,
        );
        assert.equal(fallo.reason.code, "CONFLICT");
        assert.equal(
          (await db.ausencia.findUniqueOrThrow({ where: { id: solicitud.id } }))
            .version,
          2,
        );
      },
    );
    await t.test(
      "cierre mensual bloquea solicitudes y resoluciones, incluso concurrentes",
      async () => {
        let anio = 2200;
        while (
          await db.periodoNomina.findUnique({
            where: { mes_anio: { mes: 6, anio } },
          })
        )
          anio++;
        const fechas = {
          ...entrada,
          fechaInicio: `${anio}-06-10`,
          fechaFin: `${anio}-06-12`,
        };
        const solicitud = await otro.caller.ausencias.crear(fechas);
        const periodo = await db.periodoNomina.create({
          data: { mes: 6, anio },
        });
        periodos.push(periodo.id);
        const resultados = await Promise.allSettled([
          admin.caller.periodosNomina.cerrar({ id: periodo.id }),
          jefeB.caller.ausencias.aprobar({
            id: solicitud.id,
            version: 1,
            aCuentaSalario: false,
          }),
        ]);
        assert.equal(resultados[0].status, "fulfilled");
        const guardada = await db.ausencia.findUniqueOrThrow({
          where: { id: solicitud.id },
        });
        assert.equal(
          guardada.estado,
          resultados[1].status === "fulfilled" ? "APROBADA" : "PENDIENTE",
        );
        await assert.rejects(otro.caller.ausencias.crear(fechas), {
          code: "BAD_REQUEST",
        });
        await assert.rejects(
          jefeB.caller.ausencias.rechazar({
            id: solicitud.id,
            version: guardada.version,
            aCuentaSalario: false,
          }),
          { code: "BAD_REQUEST" },
        );
      },
    );
    await t.test(
      "vínculo opcional, unicidad, permisos y revocación de sesiones",
      async () => {
        const libre = await db.empleado.create({
          data: {
            codigo: `${prefix}_libre`,
            nombre: "Libre",
            departamentoId: a,
            fechaIngreso: new Date("2020-01-01"),
            fechaNacimiento: new Date("1990-01-01"),
            salarioBase: 3000,
          },
        });
        await assert.rejects(
          sinEmpleado.caller.usuarios.asignarEmpleado({
            id: sinEmpleado.usuario.id,
            version: 1,
            empleadoId: libre.id,
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          admin.caller.usuarios.asignarEmpleado({
            id: admin.actor.usuarioId,
            version: 2,
            empleadoId: libre.id,
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          admin.caller.usuarios.asignarEmpleado({
            id: sinEmpleado.usuario.id,
            version: 1,
            empleadoId: otro.empleado!.id,
          }),
          { code: "CONFLICT" },
        );
        const vinculado = await admin.caller.usuarios.asignarEmpleado({
          id: sinEmpleado.usuario.id,
          version: 1,
          empleadoId: libre.id,
        });
        assert.equal(await obtenerSesion(db, sinEmpleado.headers), null);
        const accesoVinculado = await acceso(sinEmpleado.usuario.username);
        assert.equal(
          (await accesoVinculado.caller.ausencias.crear(entrada)).empleadoId,
          libre.id,
        );
        await admin.caller.usuarios.asignarEmpleado({
          id: sinEmpleado.usuario.id,
          version: vinculado.version,
          empleadoId: null,
        });
        assert.equal(await obtenerSesion(db, accesoVinculado.headers), null);
        const desvinculado = await acceso(sinEmpleado.usuario.username);
        await assert.rejects(desvinculado.caller.ausencias.crear(entrada), {
          code: "FORBIDDEN",
        });
      },
    );
    await t.test(
      "baja bloquea login, sesión vigente y contextos capturados; recontratar exige nuevo login",
      async () => {
        const actual = await db.empleado.findUniqueOrThrow({
          where: { id: empleado.empleado!.id },
        });
        await admin.caller.empleados.despedir({
          id: actual.id,
          version: actual.version,
          fechaSalida: new Date("2026-09-19"),
        });
        assert.equal(
          await db.sesion.count({ where: { usuarioId: empleado.usuario.id } }),
          0,
        );
        assert.equal(await obtenerSesion(db, empleado.headers), null);
        await assert.rejects(
          iniciarSesion(db, empleado.usuario.username, password),
          { code: "UNAUTHORIZED" },
        );
        await assert.rejects(empleado.caller.ausencias.crear(entrada), {
          code: "UNAUTHORIZED",
        });
        await assert.rejects(actorVigente(db, empleado.actor, []), {
          code: "UNAUTHORIZED",
        });
        await admin.caller.empleados.recontratar({
          id: actual.id,
          version: actual.version + 1,
        });
        assert.equal(await obtenerSesion(db, empleado.headers), null);
        await acceso(empleado.usuario.username);
        // También se valida el estado al recuperar una sesión que no fue revocada explícitamente.
        await db.empleado.update({
          where: { id: sinPermiso.empleado!.id },
          data: { estado: "INACTIVO" },
        });
        assert.equal(await obtenerSesion(db, sinPermiso.headers), null);
        await assert.rejects(actorVigente(db, sinPermiso.actor, []), {
          code: "UNAUTHORIZED",
        });
        await assert.rejects(
          iniciarSesion(db, sinPermiso.usuario.username, password),
          { code: "UNAUTHORIZED" },
        );
      },
    );
    await t.test(
      "permisos revocados no se conservan en un caller capturado",
      async () => {
        await db.rolPermiso.deleteMany({ where: { rolId: otro.rol.id } });
        await assert.rejects(otro.caller.ausencias.crear(entrada), {
          code: "FORBIDDEN",
        });
        await assert.rejects(otro.caller.ausencias.listar({}), {
          code: "FORBIDDEN",
        });
      },
    );
  } finally {
    await db.ausencia.deleteMany({
      where: { departamentoId: { in: departamentos } },
    });
    await db.departamento.updateMany({
      where: { id: { in: departamentos } },
      data: { jefeId: null },
    });
    await db.usuario.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    await db.empleado.deleteMany({ where: { codigo: { startsWith: prefix } } });
    await db.departamento.deleteMany({ where: { id: { in: departamentos } } });
    await db.periodoNomina.deleteMany({ where: { id: { in: periodos } } });
    await db.intentoLogin.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    await db.rol.deleteMany({ where: { codigo: { startsWith: prefix } } });
    await db.$disconnect();
  }
});
