import { Prisma, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { validar } from "~/shared/validar.helper";
import { autorizarNovedades, permisosNovedad } from "./novedades.policy";
import { tipoAdmitidoEnDepartamento } from "./Helpers/tipo-novedad.helper";
import {
  detalleNovedadesSchema,
  listarNovedadesSchema,
  registrarNovedadSchema,
} from "./Models/novedades.schema";

export async function contextoNovedades(db: PrismaClient, actor: ActorAcceso) {
  return db.$transaction(async (tx) => {
    const { gestor, departamento } = await autorizarNovedades(tx, actor);
    const periodos = await tx.periodoNomina.findMany({
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });
    return {
      departamento: {
        id: departamento.id,
        nombre: departamento.nombre,
        codigo: departamento.codigo,
      },
      periodos,
      puedeDetalle: gestor.permisos.includes("DEPARTMENT_EMPLOYEES.DETAIL"),
      tipos: (
        Object.keys(permisosNovedad) as (keyof typeof permisosNovedad)[]
      ).filter(
        (tipo) =>
          gestor.permisos.includes(permisosNovedad[tipo]) &&
          tipoAdmitidoEnDepartamento(tipo, departamento.codigo),
      ),
    };
  });
}

export async function listarEmpleadosDepartamento(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof listarNovedadesSchema>,
) {
  const data = validar(listarNovedadesSchema, input);
  return db.$transaction(async (tx) => {
    const { departamento } = await autorizarNovedades(tx, actor);
    const where = {
      departamentoId: departamento.id,
      OR: [
        { nombre: { contains: data.busqueda } },
        { codigo: { contains: data.busqueda } },
      ],
    };
    const total = await tx.empleado.count({ where });
    const filas = await tx.empleado.findMany({
      where,
      select: { id: true, codigo: true, nombre: true, estado: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (data.pagina - 1) * data.tamano,
      take: data.tamano,
    });
    const sumas =
      data.periodoId && filas.length
        ? await tx.novedadNomina.groupBy({
            by: ["empleadoId", "tipo"],
            where: {
              periodoId: data.periodoId,
              departamentoId: departamento.id,
              empleadoId: { in: filas.map((fila) => fila.id) },
            },
            _sum: { cantidad: true },
          })
        : [];
    return {
      total,
      filas: filas.map((fila) => ({
        ...fila,
        acumulados: Object.fromEntries(
          Object.keys(permisosNovedad).map((tipo) => [
            tipo,
            sumas
              .find((suma) => suma.empleadoId === fila.id && suma.tipo === tipo)
              ?._sum.cantidad?.toFixed(2) ?? "0.00",
          ]),
        ) as Record<keyof typeof permisosNovedad, string>,
      })),
    };
  });
}

export async function detalleEmpleadoDepartamento(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof detalleNovedadesSchema>,
) {
  const { empleadoId } = validar(detalleNovedadesSchema, input);
  return db.$transaction(async (tx) => {
    const { departamento } = await autorizarNovedades(
      tx,
      actor,
      "DEPARTMENT_EMPLOYEES.DETAIL",
    );
    const empleado = await tx.empleado.findFirst({
      where: { id: empleadoId, departamentoId: departamento.id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        fechaNacimiento: true,
        fechaIngreso: true,
        fechaSalida: true,
        salarioBase: true,
      },
    });
    if (!empleado)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No se encontró el empleado en tu departamento.",
      });
    return {
      ...empleado,
      salarioBase: empleado.salarioBase.toFixed(2),
      departamento: departamento.nombre,
    };
  });
}

export async function registrarNovedad(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof registrarNovedadSchema>,
) {
  const data = validar(registrarNovedadSchema, input);
  return transaccionOrganizacion(db, async (tx) => {
    // Mismo orden que cambios de usuario/rol y cierre de períodos.
    await tx.$queryRaw`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
    const { gestor, departamento } = await autorizarNovedades(
      tx,
      actor,
      permisosNovedad[data.tipo],
    );
    const empleado = await tx.empleado.findFirst({
      where: {
        id: data.empleadoId,
        departamentoId: departamento.id,
        estado: "ACTIVO",
      },
    });
    if (!empleado)
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "El empleado debe estar activo y pertenecer a tu departamento.",
      });
    if (!tipoAdmitidoEnDepartamento(data.tipo, departamento.codigo))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Este tipo de novedad no corresponde al departamento.",
      });
    const cantidad = new Prisma.Decimal(data.cantidad);
    const existente = await tx.novedadNomina.findUnique({
      where: { solicitudId: data.solicitudId },
    });
    if (existente) {
      if (
        existente.usuarioId !== gestor.id ||
        existente.empleadoId !== data.empleadoId ||
        existente.periodoId !== data.periodoId ||
        existente.tipo !== data.tipo ||
        !existente.cantidad.equals(cantidad)
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "La solicitud ya fue utilizada para otro registro.",
        });
      return { id: existente.id };
    }
    const periodo = await tx.periodoNomina.findUnique({
      where: { id: data.periodoId },
    });
    if (periodo?.estado !== "ABIERTO" || periodo.procesando)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selecciona un período abierto y sin generación de nómina en curso.",
      });
    if (
      empleado.fechaIngreso >= new Date(Date.UTC(periodo.anio, periodo.mes, 1))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El período es anterior al ingreso del empleado.",
      });
    const novedad = await tx.novedadNomina.create({
      data: {
        ...data,
        cantidad,
        departamentoId: departamento.id,
        usuarioId: gestor.id,
      },
    });
    return { id: novedad.id };
  });
}
