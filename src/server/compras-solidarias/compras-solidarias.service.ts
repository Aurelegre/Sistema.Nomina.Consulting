import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { conflicto } from "~/server/permisos/Helpers/acceso-policy";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { validar } from "~/shared/validar.helper";
import {
  autorizarCompra,
  autorizarContextoCompra,
} from "./compras-solidarias.policy";
import {
  crearCompraSchema,
  editarCompraSchema,
  eliminarCompraSchema,
  empleadosCompraSchema,
  listarComprasSchema,
} from "./Models/compras-solidarias.schema";

const periodoSelect = {
  id: true,
  mes: true,
  anio: true,
  estado: true,
} as const;
export function contextoCompras(db: PrismaClient, actor: ActorAcceso) {
  return db.$transaction(async (tx) => {
    const gestor = await autorizarContextoCompra(tx, actor);
    const periodos = await tx.periodoNomina.findMany({
      select: periodoSelect,
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });
    return {
      periodos,
      activo: periodos.find((p) => p.estado === "ABIERTO") ?? null,
      permisos: gestor.permisos.filter((p) =>
        p.startsWith("ASSOCIATION.PURCHASES."),
      ),
    };
  });
}

export function empleadosCompra(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof empleadosCompraSchema>,
  creacion: boolean,
) {
  const data = validar(empleadosCompraSchema, input);
  return db.$transaction(async (tx) => {
    await autorizarCompra(tx, actor, creacion ? "crear" : "consultar");
    const where: Prisma.EmpleadoWhereInput = {
      ...(creacion ? { estado: "ACTIVO" } : { compras: { some: {} } }),
      OR: [
        { nombre: { contains: data.busqueda } },
        { codigo: { contains: data.busqueda } },
      ],
    };
    const total = await tx.empleado.count({ where });
    const filas = await tx.empleado.findMany({
      where,
      select: { id: true, codigo: true, nombre: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (data.pagina - 1) * 15,
      take: 15,
    });
    return { total, filas };
  });
}

export function listarCompras(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof listarComprasSchema>,
) {
  const data = validar(listarComprasSchema, input);
  return db.$transaction(async (tx) => {
    await autorizarCompra(tx, actor, "consultar");
    const periodo = data.periodoId
      ? await tx.periodoNomina.findUnique({
          where: { id: data.periodoId },
          select: periodoSelect,
        })
      : await tx.periodoNomina.findFirst({
          where: { estado: "ABIERTO" },
          select: periodoSelect,
        });
    if (data.periodoId && !periodo)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "El período no existe.",
      });
    const where = {
      periodoId: periodo?.id ?? -1,
      empleadoId: data.empleadoId,
      detalle: { contains: data.busqueda },
    };
    const resumen = await tx.compraSolidaria.aggregate({
      where,
      _count: true,
      _sum: { monto: true },
    });
    const filas = await tx.compraSolidaria.findMany({
      where,
      include: {
        empleado: { select: { id: true, codigo: true, nombre: true } },
        usuarioRegistro: { select: { nombre: true } },
        usuarioActualizacion: { select: { nombre: true } },
      },
      orderBy: [{ fechaRegistro: "desc" }, { id: "desc" }],
      skip: (data.pagina - 1) * 15,
      take: 15,
    });
    return {
      periodo,
      total: resumen._count,
      montoTotal: resumen._sum.monto?.toFixed(2) ?? "0.00",
      filas: filas.map((f) => ({ ...f, monto: f.monto.toFixed(2) })),
    };
  });
}

function escritura<T>(
  db: PrismaClient,
  actor: ActorAcceso,
  accion: "crear" | "editar" | "eliminar",
  ejecutar: (tx: Prisma.TransactionClient, usuarioId: number) => Promise<T>,
) {
  return transaccionOrganizacion(db, async (tx) => {
    // Orden compartido con bajas y seguridad; cierre toma organización antes del período.
    await tx.$queryRaw`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
    const gestor = await autorizarCompra(tx, actor, accion);
    return ejecutar(tx, gestor.id);
  });
}
async function comprobarAbierto(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw`SELECT id FROM periodo_nomina WHERE id = ${id} FOR UPDATE`;
  const periodo = await tx.periodoNomina.findUnique({ where: { id } });
  if (periodo?.estado !== "ABIERTO" || periodo.procesando)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "El período está cerrado, en procesamiento o ya no está disponible. Actualiza la pantalla.",
    });
}
export function crearCompra(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof crearCompraSchema>,
) {
  const data = validar(crearCompraSchema, input);
  return escritura(db, actor, "crear", async (tx, usuarioId) => {
    const activo = await tx.periodoNomina.findFirst({
      where: { estado: "ABIERTO" },
      select: { id: true },
    });
    if (!activo)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No hay un período abierto para registrar compras.",
      });
    if (activo.id !== data.periodoId)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "El período activo cambió. Cierra el formulario y vuelve a intentarlo.",
      });
    await comprobarAbierto(tx, activo.id);
    const empleado = await tx.empleado.findUnique({
      where: { id: data.empleadoId },
      select: { estado: true },
    });
    if (empleado?.estado !== "ACTIVO")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Solo se pueden registrar compras a empleados activos.",
      });
    return tx.compraSolidaria.create({
      data: {
        ...data,
        periodoId: activo.id,
        monto: new Prisma.Decimal(data.monto),
        usuarioRegistroId: usuarioId,
      },
      select: { id: true },
    });
  });
}
export function editarCompra(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof editarCompraSchema>,
) {
  const data = validar(editarCompraSchema, input);
  return escritura(db, actor, "editar", async (tx, usuarioId) => {
    const compra = await tx.compraSolidaria.findUnique({
      where: { id: data.id },
    });
    if (!compra) throw conflicto();
    await comprobarAbierto(tx, compra.periodoId);
    const resultado = await tx.compraSolidaria.updateMany({
      where: { id: data.id, version: data.version },
      data: {
        monto: new Prisma.Decimal(data.monto),
        detalle: data.detalle,
        usuarioActualizacionId: usuarioId,
        version: { increment: 1 },
      },
    });
    if (!resultado.count) throw conflicto();
    return { id: compra.id };
  });
}
export function eliminarCompra(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof eliminarCompraSchema>,
) {
  const data = validar(eliminarCompraSchema, input);
  return escritura(db, actor, "eliminar", async (tx) => {
    const compra = await tx.compraSolidaria.findUnique({
      where: { id: data.id },
    });
    if (!compra) throw conflicto();
    await comprobarAbierto(tx, compra.periodoId);
    const resultado = await tx.compraSolidaria.deleteMany({
      where: { id: data.id, version: data.version },
    });
    if (!resultado.count) throw conflicto();
    return { id: compra.id };
  });
}
