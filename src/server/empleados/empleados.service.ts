import { Prisma, PrismaClient } from "@prisma/client";
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
import { TRPCError } from "@trpc/server";

export async function crearEmpleado(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: CrearEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "crear");
  const validado = crearEmpleadoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  try {
    return await db.empleado.create({ data: validado.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya existe un empleado con ese código.",
      });
    }
    throw error;
  }
}

export async function editarEmpleado(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: EditarEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "editar");
  const validado = editarEmpleadoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const {
    id,
    nombre,
    version,
    departamentoId,
    fechaIngreso,
    fechaNacimiento,
    salarioBase,
  } = validado.data;
  try {
    // la versión se incrementa automáticamente para evitar conflictos de concurrencia.
    const resultado = await db.empleado.updateMany({
      where: { id, version },
      data: {
        nombre,
        departamentoId,
        fechaIngreso,
        fechaNacimiento,
        salarioBase,
        version: { increment: 1 },
      },
    });
    //se valida si el registro fue actualizado, si no se actualizó se lanza un error de conflicto
    if (resultado.count === 0) {
      const existente = await db.empleado.findUnique({
        where: { id },
        select: { id: true },
      });
      throw new TRPCError(
        existente
          ? {
              code: "CONFLICT",
              message:
                "El registro fue modificado por otro usuario. Vuelve a cargar la información.",
            }
          : {
              code: "NOT_FOUND",
              message: "No se encontró el empleado.",
            },
      );
    }
    return { id, version: version + 1 };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya existe un empleado con ese código.",
      });
    }
    throw error;
  }
}

export async function despedirEmpleado(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: DesactivarEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "desactivar");
  const validado = desactivarEmpleadoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const { id, version } = validado.data;
  const resultado = await db.empleado.updateMany({
    where: { id, version, estado: "ACTIVO" },
    data: {
      estado: "INACTIVO",
      version: { increment: 1 },
      fechaSalida: new Date(),
    },
  });
  if (!resultado.count) {
    const existe = await db.empleado.findUnique({
      where: { id },
      select: { id: true },
    });
    throw new TRPCError(
      existe
        ? {
            code: "CONFLICT",
            message:
              "El registro fue modificado por otro usuario. Vuelve a cargar la información.",
          }
        : {
            code: "NOT_FOUND",
            message: "No se encontró el empleado.",
          },
    );
  }
  return { id, version: version + 1 };
}

export async function recontratarEmpleado(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: ReactivarEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "reactivar");
  const validado = reactivarEmpleadoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const { id, version } = validado.data;
  const resultado = await db.empleado.updateMany({
    where: { id, version, estado: "INACTIVO" },
    data: { estado: "ACTIVO", version: { increment: 1 }, fechaSalida: null },
  });
  if (!resultado.count) {
    const existe = await db.empleado.findUnique({
      where: { id },
      select: { id: true },
    });
    throw new TRPCError(
      existe
        ? {
            code: "CONFLICT",
            message:
              "El registro fue modificado por otro usuario. Vuelve a cargar la información.",
          }
        : {
            code: "NOT_FOUND",
            message: "No se encontró el empleado.",
          },
    );
  }
  return { id, version: version + 1 };
}

export async function listarEmpleados(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ListarEmpleadosInput,
) {
  await autorizarEmpleados(db, actor, "consultar");
  const validado = listarEmpleadosSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const where: Prisma.EmpleadoWhereInput = {
    nombre: { contains: validado.data.busqueda },
    departamentoId: validado.data.departamentoId,
    estado: validado.data.estado,
    codigo: validado.data.codigo,
    fechaIngreso: {
      gte: validado.data.fechaIngresoDesde,
      lte: validado.data.fechaIngresoHasta,
    },
  };
  const [total, filas] = await db.$transaction([
    db.empleado.count({ where }),
    db.empleado.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        fechaIngreso: true,
        fechaNacimiento: true,
        departamento: { select: { nombre: true, id: true } },
        estado: true,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (validado.data.pagina - 1) * validado.data.tamano,
      take: validado.data.tamano,
    }),
  ]);
  return {
    total,
    filas,
  };
}

export async function obtenerEmpleado(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ObtenerEmpleadoInput,
) {
  await autorizarEmpleados(db, actor, "consultar");
  const validado = obtenerEmpleadoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const { id, version } = validado.data;
  const empleado = await db.empleado.findUnique({
    where: { id, version },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      salarioBase: true,
      fechaIngreso: true,
      fechaNacimiento: true,
      departamento: { select: { nombre: true, id: true } },
      estado: true,
      departamentoQueDirige: { select: { id: true, nombre: true } },
    },
  });
  if (!empleado) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No se encontró el empleado.",
    });
  }
  return empleado;
}
