import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import type {
  CrearDepartamentoInput,
  DesactivarDepartamentoInput,
  EditarDepartamentoInput,
} from "./Models/departamentos.model";
import {
  crearDepartamentoSchema,
  desactivarDepartamentoSchema,
  editarDepartamentoSchema,
} from "./Models/departamentos.schema";
import { autorizarDepartamentos } from "./departamentos.policy";

export async function crearDepartamento(
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
  // La asignación obligatoria de jefe se integrará con la feature de empleados.
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

export async function desactivarDepartamento(
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
  // Al implementar empleados se debe verificar, de forma atómica con esta escritura,
  // que no existan empleados asignados. Esta validación está aplazada explícitamente.
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

export async function editarDepartamento(
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
  const { id, version, nombre, cuentaContable } = validado.data;
  try {
    // La versión se compara en la misma escritura: dos ediciones no pueden ganar.
    const resultado = await db.departamento.updateMany({
      where: { id, version },
      data: { nombre, cuentaContable, version: { increment: 1 } },
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
