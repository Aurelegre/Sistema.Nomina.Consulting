import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../../src/server/sesion/Helpers/password";
import { digest } from "../../src/server/sesion/Helpers/sesion.helper";
import { PERMISOS } from "../../src/server/permisos/Helpers/permisos";

export async function prepararNovedades() {
  const db = new PrismaClient();
  const prefix = `news_${randomBytes(5).toString("hex")}`;
  const permisos = Object.keys(PERMISOS).filter(
    (p) =>
      p.startsWith("DEPARTMENT_EMPLOYEES.") ||
      [
        "PAYROLL_NEWS.OVERTIME",
        "PAYROLL_NEWS.DOUBLE_TIME",
        "PAYROLL_NEWS.PRODUCTION",
        "PAYROLL_NEWS.SALES",
      ].includes(p),
  );
  for (const codigo of permisos)
    await db.permiso.upsert({
      where: { codigo },
      create: { codigo, nombre: codigo },
      update: {},
    });
  const departamento = await db.departamento.create({
    data: { codigo: prefix, nombre: prefix },
  });
  const otro = await db.departamento.create({
    data: { codigo: `${prefix}_otro`, nombre: `${prefix}_otro` },
  });
  const empleado = async (sufijo: string, departamentoId = departamento.id) =>
    db.empleado.create({
      data: {
        codigo: `${prefix}_${sufijo}`,
        nombre: `${prefix} ${sufijo}`,
        departamentoId,
        fechaNacimiento: new Date("1990-01-01"),
        fechaIngreso: new Date("2020-01-01"),
        salarioBase: 4000,
      },
    });
  const jefe = await empleado("jefe");
  const trabajador = await empleado("trabajador");
  const externo = await empleado("externo", otro.id);
  await db.departamento.update({
    where: { id: departamento.id },
    data: { jefeId: jefe.id },
  });
  const rol = await db.rol.create({
    data: {
      codigo: prefix,
      nombre: prefix,
      permisos: {
        create: permisos.map((codigo) => ({
          permiso: { connect: { codigo } },
        })),
      },
    },
  });
  const token = randomBytes(32).toString("hex");
  const usuario = await db.usuario.create({
    data: {
      username: prefix,
      nombre: prefix,
      rolId: rol.id,
      empleadoId: jefe.id,
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
      debeCambiarPassword: false,
    },
  });
  const sesion = await db.sesion.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: digest(token),
      fechaExpiracion: new Date(Date.now() + 3600000),
    },
  });
  // Años aleatorios fuera de datos operativos, con dos meses en el mismo año.
  const anio = 3000 + Math.floor(Math.random() * 5000);
  const periodo = await db.periodoNomina.create({ data: { mes: 1, anio } });
  const segundo = await db.periodoNomina.create({
    data: { mes: 2, anio, estado: "CERRADO", fechaCierre: new Date() },
  });
  return {
    db,
    prefix,
    departamento,
    otro,
    jefe,
    trabajador,
    externo,
    usuario,
    rol,
    token,
    periodo,
    segundo,
    actor: { usuarioId: usuario.id, sesionId: sesion.id },
    async limpiar() {
      await db.novedadNomina.deleteMany({
        where: { departamentoId: { in: [departamento.id, otro.id] } },
      });
      await db.usuario.delete({ where: { id: usuario.id } });
      await db.rol.delete({ where: { id: rol.id } });
      await db.departamento.updateMany({
        where: { id: { in: [departamento.id, otro.id] } },
        data: { jefeId: null },
      });
      await db.empleado.deleteMany({
        where: { departamentoId: { in: [departamento.id, otro.id] } },
      });
      await db.departamento.deleteMany({
        where: { id: { in: [departamento.id, otro.id] } },
      });
      await db.periodoNomina.deleteMany({
        where: { id: { in: [periodo.id, segundo.id] } },
      });
      await db.$disconnect();
    },
  };
}
