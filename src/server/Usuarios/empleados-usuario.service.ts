import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import { actorVigente } from "../permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "../permisos/Models/ActorAcceso.Model";
import { empleadoAsignadoUsuario } from "../empleados/Models/empleadoasignadousuario.model";
import { validar } from "~/shared/validar.helper";
import { empleadosSinUsuarioSchema } from "./Models/usuarios.schema";

export async function listarEmpleadosSinUsuario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof empleadosSinUsuarioSchema>,
) {
  await actorVigente(db, actor, ["USERS.ASSIGN_EMPLOYEE"]);
  const data = validar(empleadosSinUsuarioSchema, input);
  const where: Prisma.EmpleadoWhereInput = {
    estado: "ACTIVO",
    usuario: null,
    departamentoId: data.departamentoId,
    OR: [
      { codigo: { contains: data.busqueda } },
      { nombre: { contains: data.busqueda } },
    ],
  };
  const [total, filas] = await db.$transaction([
    db.empleado.count({ where }),
    db.empleado.findMany({
      where,
      select: empleadoAsignadoUsuario,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (data.pagina - 1) * data.tamano,
      take: data.tamano,
    }),
  ]);
  return { total, filas };
}

export async function departamentosAsignacion(
  db: PrismaClient,
  actor: ActorAcceso,
) {
  await actorVigente(db, actor, ["USERS.ASSIGN_EMPLOYEE"]);
  return db.departamento.findMany({
    where: { empleados: { some: { estado: "ACTIVO", usuario: null } } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

// Se ejecuta dentro de la transacción que bloquea organización y seguridad.
export async function comprobarEmpleadoDisponible(
  tx: Prisma.TransactionClient,
  empleadoId: number,
  usuarioId?: number,
) {
  const empleado = await tx.empleado.findUnique({
    where: { id: empleadoId },
    select: { estado: true, usuario: { select: { id: true } } },
  });
  if (empleado?.estado !== "ACTIVO")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selecciona un empleado activo.",
    });
  if (empleado.usuario && empleado.usuario.id !== usuarioId)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "El empleado ya está vinculado a otro usuario. Actualiza la lista y selecciona otro.",
    });
}
