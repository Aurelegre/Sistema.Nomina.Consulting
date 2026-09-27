import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { validar } from "~/shared/validar.helper";
import { departamentoActivo } from "~/server/empleados/Helpers/organizacion.helper";
import {
  ambitoAusencias,
  autorizarAusencias,
  autorizarResolucion,
  empleadoSolicitante,
} from "./ausencias.policy";
import {
  comprobarMesAbierto,
  transaccionAusencias,
} from "./Helpers/ausencias.helper";
import {
  crearAusenciaSchema,
  listarAusenciasSchema,
  obtenerAusenciaSchema,
  resolverAusenciaSchema,
} from "./Models/ausencias.schema";
import type {
  CrearAusenciaInput,
  EmpleadosRevisionInput,
  ListarAusenciasInput,
  ObtenerAusenciaInput,
  ResolverAusenciaInput,
} from "./Models/ausencias.model";

const relaciones = {
  empleado: { select: { id: true, codigo: true, nombre: true } },
  departamento: { select: { id: true, codigo: true, nombre: true } },
  usuarioCreacion: { select: { id: true, nombre: true } },
  usuarioResolucion: { select: { id: true, nombre: true } },
} satisfies Prisma.AusenciaInclude;

export async function crearAusencia(
  db: PrismaClient,
  actor: ActorAcceso,
  input: CrearAusenciaInput,
) {
  return transaccionAusencias(db, async (tx) => {
    const gestor = await autorizarAusencias(tx, actor, "crear");
    const empleado = empleadoSolicitante(gestor);
    const data = validar(crearAusenciaSchema, input);
    if (data.fechaInicio < empleado.fechaIngreso)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La ausencia no puede iniciar antes del ingreso del empleado.",
      });
    await departamentoActivo(tx, empleado.departamentoId);
    await comprobarMesAbierto(tx, data.fechaInicio);
    return tx.ausencia.create({
      data: {
        ...data,
        empleadoId: empleado.id,
        departamentoId: empleado.departamentoId,
        usuarioCreacionId: gestor.id,
      },
      include: relaciones,
    });
  });
}
export async function listarAusencias(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ListarAusenciasInput,
) {
  return db.$transaction(async (tx) => {
    const gestor = await autorizarAusencias(tx, actor, "consultar");
    const data = validar(listarAusenciasSchema, input);
    const where: Prisma.AusenciaWhereInput = {
      AND: [
        ambitoAusencias(gestor, data.ambito),
        {
          empleadoId: data.empleadoId,
          departamentoId: data.departamentoId,
          estado: data.estado,
          // Días completos de ingreso de solicitud en Guatemala (UTC-06).
          fechaCreacion: {
            gte: data.ingresadaDesde
              ? new Date(data.ingresadaDesde.getTime() + 6 * 3600000)
              : undefined,
            lt: data.ingresadaHasta
              ? new Date(data.ingresadaHasta.getTime() + 30 * 3600000)
              : undefined,
          },
          fechaInicio: { lte: data.hasta },
          fechaFin: { gte: data.desde },
          OR: [
            { motivo: { contains: data.busqueda } },
            { empleado: { nombre: { contains: data.busqueda } } },
            { empleado: { codigo: { contains: data.busqueda } } },
          ],
        },
      ],
    };
    const total = await tx.ausencia.count({ where });
    const filas = await tx.ausencia.findMany({
      where,
      include: relaciones,
      orderBy: [{ fechaCreacion: "desc" }, { id: "desc" }],
      skip: (data.pagina - 1) * data.tamano,
      take: data.tamano,
    });
    return { total, filas };
  });
}
export async function obtenerAusencia(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ObtenerAusenciaInput,
) {
  return db.$transaction(async (tx) => {
    const gestor = await autorizarAusencias(tx, actor, "consultar");
    const { id, ambito } = validar(obtenerAusenciaSchema, input);
    const ausencia = await tx.ausencia.findFirst({
      where: { AND: [{ id }, ambitoAusencias(gestor, ambito)] },
      include: relaciones,
    });
    if (!ausencia)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No se encontró la solicitud de ausencia.",
      });
    return ausencia;
  });
}
async function resolverAusencia(
  db: PrismaClient,
  actor: ActorAcceso,
  input: ResolverAusenciaInput,
  estado: "APROBADA" | "RECHAZADA",
) {
  return transaccionAusencias(db, async (tx) => {
    const gestor = await autorizarAusencias(tx, actor, "resolver");
    const data = validar(resolverAusenciaSchema, input);
    const ausencia = await tx.ausencia.findUnique({ where: { id: data.id } });
    if (!ausencia)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No se encontró la solicitud de ausencia.",
      });
    autorizarResolucion(gestor, ausencia.departamentoId);
    await comprobarMesAbierto(tx, ausencia.fechaInicio);
    const resultado = await tx.ausencia.updateMany({
      where: { id: data.id, version: data.version, estado: "PENDIENTE" },
      data: {
        estado,
        aCuentaSalario: data.aCuentaSalario,
        comentarioResolucion:
          data.comentarioResolucion === ""
            ? null
            : (data.comentarioResolucion ?? null),
        usuarioResolucionId: gestor.id,
        fechaResolucion: new Date(),
        version: { increment: 1 },
      },
    });
    if (!resultado.count)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "La solicitud cambió o ya fue resuelta. Las resoluciones son definitivas.",
      });
    return tx.ausencia.findUniqueOrThrow({
      where: { id: data.id },
      include: relaciones,
    });
  });
}
export const aprobarAusencia = (
  db: PrismaClient,
  actor: ActorAcceso,
  input: ResolverAusenciaInput,
) => resolverAusencia(db, actor, input, "APROBADA");
export const rechazarAusencia = (
  db: PrismaClient,
  actor: ActorAcceso,
  input: ResolverAusenciaInput,
) => resolverAusencia(db, actor, input, "RECHAZADA");

export async function contextoAusencias(db: PrismaClient, actor: ActorAcceso) {
  const gestor = await autorizarAusencias(db, actor, "consultar");
  const empleado = gestor.empleado
    ? await db.empleado.findUnique({
        where: { id: gestor.empleado.id },
        select: {
          id: true,
          nombre: true,
          fechaIngreso: true,
          departamento: { select: { id: true, nombre: true } },
          departamentoQueDirige: { select: { id: true, nombre: true } },
        },
      })
    : null;
  return {
    empleado,
    puedeCrear: !!empleado && gestor.permisos.includes("ABSENCES.CREATE"),
    puedeResolver:
      !!empleado?.departamentoQueDirige &&
      gestor.permisos.includes("ABSENCES.APPROVE"),
    puedeConsultarHistorico:
      !!empleado && gestor.permisos.includes("ABSENCES.HISTORICAL_VIEW"),
  };
}
export async function empleadosRevision(
  db: PrismaClient,
  actor: ActorAcceso,
  input: EmpleadosRevisionInput,
) {
  return db.$transaction(async (tx) => {
    const gestor = await autorizarAusencias(tx, actor, "consultar");
    ambitoAusencias(gestor, input.ambito);
    const departamentoId = gestor.empleado!.departamentoQueDirige?.id;
    return tx.empleado.findMany({
      where: {
        OR: [{ departamentoId }, { ausencias: { some: { departamentoId } } }],
      },
      select: { id: true, codigo: true, nombre: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  });
}
