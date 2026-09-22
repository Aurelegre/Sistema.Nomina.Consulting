import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { seed } from "../prisma/seed";
import {
  iniciarSesion,
  cambiarPrimeraPassword,
} from "../src/server/sesion/auth.service";
import { createCaller } from "../src/server/api/root";
import {
  cookieSesion,
  obtenerSesion,
} from "~/server/sesion/Helpers/sesion.helper";

void test("administración de acceso con cuentas temporales", async (t) => {
  const sufijo = randomBytes(6).toString("hex");
  const nombre = (valor: string) => `test_access_${sufijo}_${valor}`;
  const codigo = (valor: string) => `TEST_${sufijo.toUpperCase()}_${valor}`;
  const db = new PrismaClient();
  const password = randomBytes(24).toString("base64url");
  const caller = async (token?: string) => {
    const headers = new Headers(
      token ? { cookie: cookieSesion(token) } : undefined,
    );
    return createCaller({
      db,
      headers,
      responseHeaders: new Headers(),
      sesion: await obtenerSesion(db, headers),
    });
  };
  try {
    await seed(db, { username: nombre("admin"), password });
    const admin = await db.usuario.findUniqueOrThrow({
      where: { username: nombre("admin") },
    });
    await cambiarPrimeraPassword(db, admin.id, password, `${password}new`);
    const adminToken = (
      await iniciarSesion(db, admin.username, `${password}new`)
    ).token;
    const api = await caller(adminToken);
    const rolBasico = await api.roles.crear({
      codigo: codigo("BASICO"),
      nombre: nombre("Básico"),
      descripcion: "Sin permisos",
    });

    await t.test(
      "autorización, campos sensibles, duplicados y edición concurrente",
      async () => {
        await assert.rejects((await caller()).usuarios.listar({}), {
          code: "UNAUTHORIZED",
        });
        const creado = await api.usuarios.crear({
          username: nombre("operador"),
          nombre: nombre("Operador"),
          rolId: rolBasico.id,
        });
        const inicial = await iniciarSesion(
          db,
          nombre("operador"),
          creado.passwordTemporal,
        );
        await assert.rejects(
          (await caller(inicial.token)).usuarios.listar({}),
          { code: "FORBIDDEN" },
        );
        await cambiarPrimeraPassword(
          db,
          creado.usuario.id,
          creado.passwordTemporal,
          password,
        );
        const limitado = (await iniciarSesion(db, nombre("operador"), password))
          .token;
        await assert.rejects((await caller(limitado)).usuarios.listar({}), {
          code: "FORBIDDEN",
        });
        await assert.rejects(
          api.usuarios.crear({
            username: nombre("OPERADOR"),
            nombre: nombre("Duplicado"),
            rolId: rolBasico.id,
          }),
          { code: "CONFLICT" },
        );
        const vigente = await db.usuario.findUniqueOrThrow({
          where: { id: creado.usuario.id },
        });
        const entrada = {
          id: vigente.id,
          version: vigente.version,
          nombre: nombre("Editado"),
          username: nombre("operador"),
        };
        await assert.rejects(
          api.usuarios.editar(
            Object.assign({}, entrada, { debeCambiarPassword: false }),
          ),
          { code: "BAD_REQUEST" },
        );
        const resultados = await Promise.allSettled([
          api.usuarios.editar(entrada),
          api.usuarios.editar({ ...entrada, nombre: "Otro" }),
        ]);
        assert.equal(
          resultados.filter((r) => r.status === "fulfilled").length,
          1,
        );
        const lista = await api.usuarios.listar({
          busqueda: nombre("operador"),
        });
        assert.equal(lista.total, 1);
        assert.equal(Object.hasOwn(lista.filas[0]!, "passwordHash"), false);
        const actual = lista.filas[0]!;
        await db.intentoLogin.upsert({
          where: { username: actual.username },
          create: {
            username: actual.username,
            intentos: 6,
            ventanaHasta: new Date(Date.now() + 900000),
          },
          update: { intentos: 6 },
        });
        const reset = await api.usuarios.restablecerPassword({
          id: actual.id,
          version: actual.version,
        });
        assert.equal(
          await db.intentoLogin.count({ where: { username: actual.username } }),
          0,
        );
        assert.equal(
          await obtenerSesion(
            db,
            new Headers({ cookie: cookieSesion(limitado) }),
          ),
          null,
        );
        assert.equal(
          (await iniciarSesion(db, actual.username, reset.passwordTemporal))
            .debeCambiarPassword,
          true,
        );
        const despuesReset = await db.usuario.findUniqueOrThrow({
          where: { id: actual.id },
        });
        await api.usuarios.cambiarEstado({
          id: actual.id,
          version: despuesReset.version,
          estado: "INACTIVO",
        });
        await assert.rejects(
          iniciarSesion(db, actual.username, reset.passwordTemporal),
          { code: "UNAUTHORIZED" },
        );
        const inactivo = await db.usuario.findUniqueOrThrow({
          where: { id: actual.id },
        });
        await api.usuarios.cambiarEstado({
          id: actual.id,
          version: inactivo.version,
          estado: "ACTIVO",
        });
      },
    );

    await t.test(
      "roles protegidos, sesiones revocadas y seed repetible",
      async () => {
        const rolAdmin = await db.rol.findUniqueOrThrow({
          where: { codigo: "ADMINISTRADOR" },
        });
        await assert.rejects(
          api.roles.guardarPermisos({
            id: rolAdmin.id,
            version: rolAdmin.version,
            codigos: [],
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          api.roles.cambiarEstado({
            id: rolAdmin.id,
            version: rolAdmin.version,
            estado: "INACTIVO",
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          api.usuarios.asignarRol({
            id: admin.id,
            version: (
              await db.usuario.findUniqueOrThrow({ where: { id: admin.id } })
            ).version,
            rolId: rolBasico.id,
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          api.roles.cambiarEstado({
            id: rolBasico.id,
            version: rolBasico.version,
            estado: "INACTIVO",
          }),
          { code: "BAD_REQUEST" },
        );
        await api.roles.guardarPermisos({
          id: rolBasico.id,
          version: rolBasico.version,
          codigos: ["PAYROLL_PERIODS.VIEW"],
        });
        await assert.rejects(
          api.roles.editar({
            id: rolBasico.id,
            version: rolBasico.version,
            nombre: "Viejo",
            descripcion: "",
          }),
          { code: "CONFLICT" },
        );
        const finanzas = await db.rol.findUniqueOrThrow({
          where: { codigo: "FINANZAS_CONSULTA" },
          include: { permisos: true },
        });
        const hashAntes = (
          await db.usuario.findUniqueOrThrow({ where: { id: admin.id } })
        ).passwordHash;
        await seed(db, {
          username: admin.username,
          password: "otro_password_temporal",
        });
        assert.equal(
          (await db.usuario.findUniqueOrThrow({ where: { id: admin.id } }))
            .passwordHash,
          hashAntes,
        );
        assert.equal(
          await db.rolPermiso.count({ where: { rolId: finanzas.id } }),
          finanzas.permisos.length,
        );
        assert.equal(
          await db.rolPermiso.count({ where: { rolId: rolBasico.id } }),
          1,
        );
        assert.equal(
          await db.rol.count({
            where: {
              codigo: {
                in: ["NOMINA_RRHH", "JEFE_DEPARTAMENTO", "FINANZAS_CONSULTA"],
              },
            },
          }),
          3,
        );
        const usuario = await api.usuarios.crear({
          username: nombre("consulta"),
          nombre: nombre("Consulta"),
          rolId: rolBasico.id,
        });
        await cambiarPrimeraPassword(
          db,
          usuario.usuario.id,
          usuario.passwordTemporal,
          password,
        );
        const token = (await iniciarSesion(db, nombre("consulta"), password))
          .token;
        const sesionObsoleta = await caller(token);
        await sesionObsoleta.periodosNomina.listar();
        const actual = await db.rol.findUniqueOrThrow({
          where: { id: rolBasico.id },
        });
        await api.roles.guardarPermisos({
          id: actual.id,
          version: actual.version,
          codigos: [],
        });
        assert.equal(
          await obtenerSesion(db, new Headers({ cookie: cookieSesion(token) })),
          null,
        );
      },
    );

    await t.test(
      "un gestor delegado no puede elevar privilegios ni tomar cuentas superiores",
      async () => {
        const rol = await api.roles.crear({
          codigo: codigo("GESTOR"),
          nombre: nombre("Gestor"),
          descripcion: "",
        });
        await api.roles.guardarPermisos({
          id: rol.id,
          version: rol.version,
          codigos: [
            "USERS.VIEW",
            "USERS.CREATE",
            "USERS.UPDATE",
            "USERS.ASSIGN_ROLE",
            "USERS.DISABLE",
            "USERS.RESET_PASSWORD",
            "ROLES.VIEW",
            "ROLES.MANAGE",
          ],
        });
        const usuario = await api.usuarios.crear({
          username: nombre("gestor"),
          nombre: nombre("Gestor"),
          rolId: rol.id,
        });
        await cambiarPrimeraPassword(
          db,
          usuario.usuario.id,
          usuario.passwordTemporal,
          password,
        );
        const token = (await iniciarSesion(db, nombre("gestor"), password))
          .token;
        const gestor = await caller(token);
        await assert.rejects(
          gestor.usuarios.restablecerPassword({
            id: admin.id,
            version: (
              await db.usuario.findUniqueOrThrow({ where: { id: admin.id } })
            ).version,
          }),
          { code: "FORBIDDEN" },
        );
        await assert.rejects(
          gestor.usuarios.crear({
            username: nombre("escalado"),
            nombre: nombre("Escalado"),
            rolId: admin.rolId,
          }),
          { code: "FORBIDDEN" },
        );
        const basico = await db.rol.findUniqueOrThrow({
          where: { id: rolBasico.id },
        });
        await assert.rejects(
          gestor.roles.guardarPermisos({
            id: basico.id,
            version: basico.version,
            codigos: ["PAYROLL.PROCESS"],
          }),
          { code: "FORBIDDEN" },
        );
        const propio = await db.rol.findUniqueOrThrow({
          where: { id: rol.id },
        });
        await assert.rejects(
          gestor.roles.guardarPermisos({
            id: propio.id,
            version: propio.version,
            codigos: [],
          }),
          { code: "FORBIDDEN" },
        );
        const creado = await gestor.usuarios.crear({
          username: nombre("delegado"),
          nombre: nombre("Delegado"),
          rolId: rolBasico.id,
        });
        assert.equal(creado.usuario.rolId, rolBasico.id);
        // Un contexto tRPC capturado antes de revocar la sesión tampoco autoriza escrituras.
        const actualUsuario = await db.usuario.findUniqueOrThrow({
          where: { id: usuario.usuario.id },
        });
        await api.usuarios.asignarRol({
          id: actualUsuario.id,
          version: actualUsuario.version,
          rolId: rolBasico.id,
        });
        await assert.rejects(
          gestor.usuarios.crear({
            username: nombre("obsoleto"),
            nombre: nombre("Obsoleto"),
            rolId: rolBasico.id,
          }),
          { code: "UNAUTHORIZED" },
        );
      },
    );

    await t.test(
      "empleado opcional, filtros, autorización y asignación atómica",
      async () => {
        const departamento = await db.departamento.create({
          data: {
            codigo: codigo("DEP"),
            nombre: nombre("Departamento"),
            cuentaContable: "TEST",
          },
        });
        const empleado = async (
          s: string,
          estado: "ACTIVO" | "INACTIVO" = "ACTIVO",
        ) =>
          db.empleado.create({
            data: {
              codigo: codigo(s),
              nombre: nombre(s),
              departamentoId: departamento.id,
              estado,
              fechaIngreso: new Date("2020-01-01"),
              fechaNacimiento: new Date("1990-01-01"),
              salarioBase: 4000,
            },
          });
        const libre = await empleado("LIBRE");
        const inactivo = await empleado("INACTIVO", "INACTIVO");
        const competitivo = await empleado("COMPETITIVO");
        try {
          const sinEmpleado = await api.usuarios.crear({
            username: nombre("sin_empleado"),
            nombre: "Sin empleado",
            rolId: rolBasico.id,
          });
          assert.equal(sinEmpleado.usuario.empleadoId, null);
          const lista = await api.usuarios.empleadosSinUsuario({
            departamentoId: departamento.id,
            busqueda: codigo("LIBRE"),
          });
          assert.equal(lista.total, 1);
          assert.equal(
            lista.filas[0]?.departamento.nombre,
            departamento.nombre,
          );
          const paginada = await api.usuarios.empleadosSinUsuario({
            departamentoId: departamento.id,
            tamano: 1,
            pagina: 2,
          });
          assert.equal(paginada.total, 2);
          assert.equal(paginada.filas.length, 1);
          const creado = await api.usuarios.crear({
            username: nombre("con_empleado"),
            nombre: "Con empleado",
            rolId: rolBasico.id,
            empleadoId: libre.id,
          });
          assert.equal(creado.usuario.empleadoId, libre.id);
          assert.equal(
            (
              await api.usuarios.empleadosSinUsuario({
                departamentoId: departamento.id,
                busqueda: libre.nombre,
              })
            ).total,
            0,
          );
          await assert.rejects(
            api.usuarios.crear({
              username: nombre("ocupado"),
              nombre: "Ocupado",
              rolId: rolBasico.id,
              empleadoId: libre.id,
            }),
            { code: "CONFLICT" },
          );
          await assert.rejects(
            api.usuarios.crear({
              username: nombre("inactivo"),
              nombre: "Inactivo",
              rolId: rolBasico.id,
              empleadoId: inactivo.id,
            }),
            { code: "BAD_REQUEST" },
          );
          assert.equal(
            await db.usuario.count({
              where: {
                username: { in: [nombre("ocupado"), nombre("inactivo")] },
              },
            }),
            0,
          );
          const rolCreador = await db.rol.create({
            data: {
              codigo: codigo("CREADOR"),
              nombre: nombre("Creador"),
              permisos: {
                create: ["USERS.CREATE", "USERS.ASSIGN_ROLE"].map((c) => ({
                  permiso: { connect: { codigo: c } },
                })),
              },
            },
          });
          const limitado = await api.usuarios.crear({
            username: nombre("creador"),
            nombre: "Creador",
            rolId: rolCreador.id,
          });
          await cambiarPrimeraPassword(
            db,
            limitado.usuario.id,
            limitado.passwordTemporal,
            password,
          );
          const limitadoApi = await caller(
            (await iniciarSesion(db, nombre("creador"), password)).token,
          );
          await assert.rejects(limitadoApi.usuarios.empleadosSinUsuario({}), {
            code: "FORBIDDEN",
          });
          await assert.rejects(limitadoApi.usuarios.departamentosAsignacion(), {
            code: "FORBIDDEN",
          });
          await assert.rejects(
            limitadoApi.usuarios.crear({
              username: nombre("prohibido"),
              nombre: "Prohibido",
              rolId: rolBasico.id,
              empleadoId: competitivo.id,
            }),
            { code: "FORBIDDEN" },
          );
          await limitadoApi.usuarios.crear({
            username: nombre("permitido"),
            nombre: "Permitido",
            rolId: rolBasico.id,
          });
          const resultados = await Promise.allSettled([
            api.usuarios.crear({
              username: nombre("competidor"),
              nombre: "Competidor",
              rolId: rolBasico.id,
              empleadoId: competitivo.id,
            }),
            api.usuarios.asignarEmpleado({
              id: sinEmpleado.usuario.id,
              version: sinEmpleado.usuario.version,
              empleadoId: competitivo.id,
            }),
          ]);
          assert.equal(
            resultados.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            await db.usuario.count({ where: { empleadoId: competitivo.id } }),
            1,
          );
        } finally {
          await db.usuario.updateMany({
            where: {
              empleadoId: { in: [libre.id, inactivo.id, competitivo.id] },
            },
            data: { empleadoId: null },
          });
          await db.empleado.deleteMany({
            where: { departamentoId: departamento.id },
          });
          await db.departamento.delete({ where: { id: departamento.id } });
        }
      },
    );

    await t.test(
      "dos administradores concurrentes conservan un acceso activo",
      async () => {
        const segundo = await api.usuarios.crear({
          username: nombre("segundo_admin"),
          nombre: nombre("Segundo"),
          rolId: admin.rolId,
        });
        await cambiarPrimeraPassword(
          db,
          segundo.usuario.id,
          segundo.passwordTemporal,
          password,
        );
        const apiSegundo = await caller(
          (await iniciarSesion(db, nombre("segundo_admin"), password)).token,
        );
        const primeroActual = await db.usuario.findUniqueOrThrow({
          where: { id: admin.id },
        });
        const segundoActual = await db.usuario.findUniqueOrThrow({
          where: { id: segundo.usuario.id },
        });
        const resultados = await Promise.allSettled([
          api.usuarios.cambiarEstado({
            id: segundoActual.id,
            version: segundoActual.version,
            estado: "INACTIVO",
          }),
          apiSegundo.usuarios.cambiarEstado({
            id: primeroActual.id,
            version: primeroActual.version,
            estado: "INACTIVO",
          }),
        ]);
        assert.equal(
          resultados.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.equal(
          await db.usuario.count({
            where: {
              id: { in: [admin.id, segundo.usuario.id] },
              estado: "ACTIVO",
              rol: { codigo: "ADMINISTRADOR" },
            },
          }),
          1,
        );
      },
    );
  } finally {
    await db.usuario.deleteMany({
      where: { username: { startsWith: nombre("") } },
    });
    await db.intentoLogin.deleteMany({
      where: { username: { startsWith: nombre("") } },
    });
    await db.rol.deleteMany({ where: { codigo: { startsWith: codigo("") } } });
    await db.$disconnect();
  }
});
