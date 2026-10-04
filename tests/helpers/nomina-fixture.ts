import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { seed } from "../../prisma/seed";
import { digest } from "../../src/server/sesion/Helpers/sesion.helper";

export async function prepararNomina() {
  if (process.env.TIENDA_TEST_ISOLATED !== "1")
    throw new Error("Utiliza la base aislada del runner de nómina.");
  const db = new PrismaClient();
  const prefijo = `nomina_${randomBytes(5).toString("hex")}`;
  const password = randomBytes(20).toString("hex");
  await seed(db, { username: prefijo, password });
  const usuario = await db.usuario.update({
    where: { username: prefijo },
    data: { debeCambiarPassword: false },
  });
  const token = randomBytes(32).toString("hex");
  const sesion = await db.sesion.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: digest(token),
      fechaExpiracion: new Date(Date.now() + 3600000),
    },
  });
  const departamento = await db.departamento.create({
    data: {
      codigo: prefijo,
      nombre: "Producción de prueba",
      cuentaContable: "5101",
    },
  });
  const empleado = await db.empleado.create({
    data: {
      codigo: prefijo,
      nombre: "Empleado de nómina",
      salarioBase: 6000,
      fechaIngreso: new Date("2020-01-01"),
      fechaNacimiento: new Date("1990-01-01"),
      departamentoId: departamento.id,
    },
  });
  await db.usuario.update({
    where: { id: usuario.id },
    data: { empleadoId: empleado.id },
  });
  const periodo = await db.periodoNomina.create({
    data: { mes: 11, anio: 2026 },
  });
  return {
    db,
    prefijo,
    password,
    usuario,
    token,
    departamento,
    empleado,
    periodo,
    actor: { usuarioId: usuario.id, sesionId: sesion.id },
  };
}
