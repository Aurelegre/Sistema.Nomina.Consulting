import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";
import { digest } from "../../src/server/sesion/Helpers/sesion.helper";

export async function prepararCompras() {
  if (process.env.TIENDA_TEST_ISOLATED !== "1")
    throw new Error(
      "Las pruebas de compras requieren la base aislada de test:tienda.",
    );
  const db = new PrismaClient();
  const prefijo = `compra_${randomBytes(5).toString("hex")}`;
  await seed(db, {
    username: prefijo,
    password: randomBytes(24).toString("hex"),
  });
  const usuario = await db.usuario.update({
    where: { username: prefijo },
    data: { debeCambiarPassword: false },
  });
  const permisos = [
    "ASSOCIATION.PURCHASES.VIEW",
    "ASSOCIATION.PURCHASES.CREATE",
    "ASSOCIATION.PURCHASES.UPDATE",
    "ASSOCIATION.PURCHASES.DELETE",
    "EMPLOYEES.VIEW",
    "PAYROLL_PERIODS.VIEW",
    "PAYROLL_PERIODS.CREATE",
    "PAYROLL_PERIODS.CLOSE",
  ];
  const rol = await db.rol.create({
    data: {
      codigo: prefijo,
      nombre: prefijo,
      permisos: {
        create: permisos.map((codigo) => ({
          permiso: { connect: { codigo } },
        })),
      },
    },
  });
  await db.usuario.update({
    where: { id: usuario.id },
    data: { rolId: rol.id },
  });
  const token = randomBytes(32).toString("hex");
  const sesion = await db.sesion.create({
    data: {
      tokenHash: digest(token),
      usuarioId: usuario.id,
      fechaExpiracion: new Date(Date.now() + 3600000),
    },
  });
  const departamento = await db.departamento.create({
    data: { codigo: prefijo, nombre: prefijo },
  });
  const crearEmpleado = (sufijo: string) =>
    db.empleado.create({
      data: {
        codigo: `${prefijo}_${sufijo}`,
        nombre: `${prefijo} ${sufijo}`,
        departamentoId: departamento.id,
        salarioBase: 4000,
        fechaNacimiento: new Date("1990-01-01"),
        fechaIngreso: new Date("2000-01-01"),
      },
    });
  const empleado = await crearEmpleado("empleado");
  const otro = await crearEmpleado("otro");
  const periodo = await db.periodoNomina.create({
    data: { mes: 1, anio: 2091 },
  });
  const historico = await db.periodoNomina.create({
    data: { mes: 12, anio: 2090, estado: "CERRADO", fechaCierre: new Date() },
  });
  return {
    db,
    usuario,
    rol,
    empleado,
    otro,
    departamento,
    periodo,
    historico,
    token,
    actor: { usuarioId: usuario.id, sesionId: sesion.id },
    async limpiar() {
      await db.compraSolidaria.deleteMany({
        where: { empleadoId: { in: [empleado.id, otro.id] } },
      });
      await db.usuario.delete({ where: { id: usuario.id } });
      await db.rol.delete({ where: { id: rol.id } });
      await db.empleado.deleteMany({
        where: { departamentoId: departamento.id },
      });
      await db.departamento.delete({ where: { id: departamento.id } });
      await db.periodoNomina.deleteMany({
        where: { anio: { in: [2090, 2091] } },
      });
      await db.$disconnect();
    },
  };
}
