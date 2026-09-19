import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import type {
  CrearDepartamentoInput,
  DesactivarDepartamentoInput,
  EditarDepartamentoInput,
  ReactivarDepartamentoInput,
} from "./Models/departamentos.model";
import {
  crearDepartamentoSchema,
  desactivarDepartamentoSchema,
  editarDepartamentoSchema,
  reactivarDepartamentoSchema,
} from "./Models/departamentos.schema";
import { autorizarDepartamentos } from "./departamentos.policy";

async function crearDepartamentoInterno(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: CrearDepartamentoInput,
) {
  await autorizarDepartamentos(db, actor, "crear");
  const validado = crearDepartamentoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  await validarJefe(db, validado.data.jefeId);
  try {
    return await db.departamento.create({ data: validado.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya existe un departamento con ese código o nombre.",
      });
    }
    throw error;
  }
}

export async function reactivarDepartamento(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: ReactivarDepartamentoInput,
) {
  await autorizarDepartamentos(db, actor, "reactivar");
  const validado = reactivarDepartamentoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const { id, version } = validado.data;
  const resultado = await db.departamento.updateMany({
    where: { id, version, estado: "INACTIVO" },
    data: { estado: "ACTIVO", version: { increment: 1 } },
  });
  if (!resultado.count) {
    const existente = await db.departamento.findUnique({
      where: { id },
      select: { id: true },
    });
    throw new TRPCError(
      existente
        ? {
            code: "CONFLICT",
            message:
              "El departamento cambió o ya está activo. Cierra la confirmación y vuelve a consultar el listado.",
          }
        : { code: "NOT_FOUND", message: "El departamento no existe." },
    );
  }
  return { id, version: version + 1 };
}

async function desactivarDepartamentoInterno(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: DesactivarDepartamentoInput,
) {
  await autorizarDepartamentos(db, actor, "desactivar");
  const validado = desactivarDepartamentoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
    });
  }
  const { id, version } = validado.data;
  if (
    await db.empleado.count({ where: { departamentoId: id, estado: "ACTIVO" } })
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "No se puede desactivar un departamento con empleados activos asignados.",
    });
  }
  const resultado = await db.departamento.updateMany({
    where: { id, version, estado: "ACTIVO" },
    data: { estado: "INACTIVO", version: { increment: 1 } },
  });
  if (!resultado.count) {
    const existente = await db.departamento.findUnique({
      where: { id },
      select: { id: true },
    });
    throw new TRPCError(
      existente
        ? {
            code: "CONFLICT",
            message:
              "El departamento cambió o ya está inactivo. Cierra la confirmación y vuelve a consultar el listado.",
          }
        : { code: "NOT_FOUND", message: "El departamento no existe." },
    );
  }
  return { id, version: version + 1 };
}

export async function listarDepartamentos(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
) {
  await autorizarDepartamentos(db, actor, "consultar");
  return db.departamento.findMany({
    orderBy: [{ nombre: "asc" }, { id: "asc" }],
  });
}

async function editarDepartamentoInterno(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: EditarDepartamentoInput,
) {
  await autorizarDepartamentos(db, actor, "editar");
  const validado = editarDepartamentoSchema.safeParse(input);
  if (!validado.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validado.error.issues[0]?.message ?? "Datos inválidos",
      cause: validado.error,
    });
  }
  const { id, version, nombre, cuentaContable, jefeId } = validado.data;
  if (jefeId !== undefined) await validarJefe(db, jefeId, id);
  try {
    // La versión se compara en la misma escritura: dos ediciones no pueden ganar.
    const resultado = await db.departamento.updateMany({
      where: { id, version },
      data: { nombre, cuentaContable, jefeId, version: { increment: 1 } },
    });
    if (resultado.count === 0) {
      const existente = await db.departamento.findUnique({
        where: { id },
        select: { id: true },
      });
      throw new TRPCError(
        existente
          ? {
              code: "CONFLICT",
              message:
                "El departamento cambió. Cierra el formulario y vuelve a abrirlo para cargar la versión actual.",
            }
          : { code: "NOT_FOUND", message: "El departamento no existe." },
      );
    }
    // Confirmación de la escritura; el cliente vuelve a consultar el catálogo.
    return { id, version: version + 1 };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un departamento con ese nombre.",
        });
      }
    }
    throw error;
  }
}

export async function crearDepartamento(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: CrearDepartamentoInput,
) {
  return transaccionOrganizacion(db, (tx) =>
    crearDepartamentoInterno(tx, actor, input),
  );
}

export async function editarDepartamento(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: EditarDepartamentoInput,
) {
  return transaccionOrganizacion(db, (tx) =>
    editarDepartamentoInterno(tx, actor, input),
  );
}

export async function desactivarDepartamento(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  input: DesactivarDepartamentoInput,
) {
  return transaccionOrganizacion(db, (tx) =>
    desactivarDepartamentoInterno(tx, actor, input),
  );
}

async function validarJefe(
  db: Prisma.TransactionClient,
  jefeId: number,
  departamentoId?: number,
) {
  const jefe = await db.empleado.findUnique({
    where: { id: jefeId },
    include: { departamentoQueDirige: true },
  });
  if (jefe?.estado !== "ACTIVO")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selecciona un empleado activo como jefe.",
    });
  if (
    jefe.departamentoQueDirige &&
    jefe.departamentoQueDirige.id !== departamentoId
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "El empleado ya es jefe de otro departamento.",
    });
}
export async function jefesDisponibles(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
) {
  await autorizarDepartamentos(db, actor, "editar");
  return db.empleado.findMany({
    where: { estado: "ACTIVO" },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      departamentoQueDirige: { select: { id: true } },
    },
    orderBy: { nombre: "asc" },
  });
}
