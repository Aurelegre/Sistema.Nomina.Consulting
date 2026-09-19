import { type Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type z } from "zod";
import type { ActorAcceso } from "../permisos/Models/ActorAcceso.Model";
import type {
  CrearEmpleadoInput,
  DesactivarEmpleadoInput,
  EditarEmpleadoInput,
  ListarEmpleadosInput,
  ObtenerEmpleadoInput,
  ReactivarEmpleadoInput,
} from "./Models/empleados.model";
import { autorizarEmpleados } from "./empleados.policy";
import {
  crearEmpleadoSchema,
  desactivarEmpleadoSchema,
  editarEmpleadoSchema,
  listarEmpleadosSchema,
  obtenerEmpleadoSchema,
  reactivarEmpleadoSchema,
} from "./Models/empleados.schema";
import {
  departamentoActivo,
  transaccionOrganizacion,
} from "./Helpers/organizacion.helper";
import { validar } from "~/shared/validar.helper";

async function empleadoVigente(
  tx: Prisma.TransactionClient,
  id: number,
  version: number,
) {
  const empleado = await tx.empleado.findUnique({
    where: { id },
    include: { departamentoQueDirige: true },
  });
  if (!empleado)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No se encontró el empleado.",
    });
  if (empleado.version !== version)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "El empleado cambió. Cierra el modal y vuelve a abrirlo para cargar la información actual.",
    });
  return empleado;
}
export async function crearEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: CrearEmpleadoInput,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await autorizarEmpleados(tx, actor, "crear");
    const data = validar(crearEmpleadoSchema, input);
    await departamentoActivo(tx, data.departamentoId);
    const empleado = await tx.empleado.create({ data });
    return { id: empleado.id, version: empleado.version };
  });
}
export async function editarEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: EditarEmpleadoInput,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await autorizarEmpleados(tx, actor, "editar");
    const { id, version, ...data } = validar(editarEmpleadoSchema, input);
    const empleado = await empleadoVigente(tx, id, version);
    await departamentoActivo(tx, data.departamentoId);
    if (empleado.fechaSalida && data.fechaIngreso > empleado.fechaSalida)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "La fecha de ingreso no puede ser posterior a la fecha de salida.",
      });
    await tx.empleado.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    return { id, version: version + 1 };
  });
}
export async function despedirEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: DesactivarEmpleadoInput,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await autorizarEmpleados(tx, actor, "desactivar");
    const { id, version, fechaSalida } = validar(
      desactivarEmpleadoSchema,
      input,
    );
    const empleado = await empleadoVigente(tx, id, version);
    if (empleado.estado !== "ACTIVO")
      throw new TRPCError({
        code: "CONFLICT",
        message: "El empleado ya está inactivo.",
      });
    if (empleado.departamentoQueDirige)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Asigna otro jefe al departamento antes de dar de baja a este empleado.",
      });
    if (fechaSalida < empleado.fechaIngreso)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "La fecha de salida no puede ser anterior a la fecha de ingreso.",
      });
    await tx.empleado.update({
      where: { id, version },
      data: { estado: "INACTIVO", fechaSalida, version: { increment: 1 } },
    });
    return { id, version: version + 1 };
  });
}
export async function recontratarEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ReactivarEmpleadoInput,
) {
  return transaccionOrganizacion(db, async (tx) => {
    await autorizarEmpleados(tx, actor, "reactivar");
    const { id, version } = validar(reactivarEmpleadoSchema, input);
    const empleado = await empleadoVigente(tx, id, version);
    if (empleado.estado !== "INACTIVO")
      throw new TRPCError({
        code: "CONFLICT",
        message: "El empleado ya está activo.",
      });
    await departamentoActivo(tx, empleado.departamentoId);
    await tx.empleado.update({
      where: { id, version },
      data: { estado: "ACTIVO", fechaSalida: null, version: { increment: 1 } },
    });
    return { id, version: version + 1 };
  });
}
export async function listarEmpleados(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ListarEmpleadosInput,
) {
  await autorizarEmpleados(db, actor, "consultar");
  const data = validar(listarEmpleadosSchema, input);
  const where: Prisma.EmpleadoWhereInput = {
    OR: [
      { nombre: { contains: data.busqueda } },
      { codigo: { contains: data.busqueda } },
    ],
    departamentoId: data.departamentoId,
    estado: data.estado,
    codigo: data.codigo,
    fechaIngreso: { gte: data.fechaIngresoDesde, lte: data.fechaIngresoHasta },
  };
  const [total, filas] = await db.$transaction([
    db.empleado.count({ where }),
    db.empleado.findMany({
      where,
      select: {
        id: true,
        version: true,
        nombre: true,
        codigo: true,
        fechaIngreso: true,
        fechaNacimiento: true,
        fechaSalida: true,
        salarioBase: true,
        departamento: { select: { nombre: true, id: true } },
        estado: true,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (data.pagina - 1) * data.tamano,
      take: data.tamano,
    }),
  ]);
  return {
    total,
    filas: filas.map((fila) => ({
      ...fila,
      salarioBase: fila.salarioBase.toFixed(2),
    })),
  };
}
export async function obtenerEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ObtenerEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "consultar");
  const { id } = validar(obtenerEmpleadoSchema, input);
  const empleado = await db.empleado.findUnique({
    where: { id },
    include: {
      departamento: { select: { nombre: true, id: true } },
      departamentoQueDirige: { select: { id: true, nombre: true } },
    },
  });
  if (!empleado)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No se encontró el empleado.",
    });
  return { ...empleado, salarioBase: empleado.salarioBase.toFixed(2) };
}
export async function departamentosEmpleados(
  db: PrismaClient,
  actor: ActorAcceso,
) {
  await autorizarEmpleados(db, actor, "consultar");
  return db.departamento.findMany({
    select: { id: true, nombre: true, estado: true },
    orderBy: { nombre: "asc" },
  });
}
