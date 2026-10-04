import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { validar } from "~/shared/validar.helper";
import { autorizarNomina, comprobarPeriodoDisponible } from "./nomina.policy";
import {
  generarNominaSchema,
  filtroNominaSchema,
  detalleNominaSchema,
  idNominaSchema,
} from "./Models/nomina.schema";
import { csvNomina } from "./Helpers/csv.helper";

export function decimales<T extends object>(fila: T) {
  return Object.fromEntries(
    Object.entries(fila).map(([k, v]) => [
      k,
      v instanceof Prisma.Decimal ? v.toFixed(k === "tasaComision" ? 4 : 2) : v,
    ]),
  ) as {
    [K in keyof T]: T[K] extends Prisma.Decimal ? string : T[K];
  };
}

export async function contextoNomina(db: PrismaClient, actor: ActorAcceso) {
  const gestor = await autorizarNomina(db, actor);
  if (
    !gestor.permisos.some((p) =>
      [
        "PAYROLL.PROCESS",
        "PAYROLL.VIEW",
        "PAYROLL.DETAIL",
        "PAYROLL.EXPORT",
      ].includes(p),
    )
  )
    throw new TRPCError({ code: "FORBIDDEN" });
  const activo = await db.periodoNomina.findFirst({
    where: { estado: { in: ["ABIERTO", "PROCESANDO"] } },
  });
  return { activo, permisos: gestor.permisos };
}

export async function solicitarNomina(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof generarNominaSchema>,
) {
  const { periodoId } = validar(generarNominaSchema, input);
  return transaccionOrganizacion(db, async (tx) => {
    await tx.$queryRaw`SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR' FOR UPDATE`;
    const gestor = await autorizarNomina(tx, actor, "PAYROLL.PROCESS");
    await tx.$queryRaw`SELECT id FROM periodo_nomina WHERE id=${periodoId} FOR UPDATE`;
    const periodo = await comprobarPeriodoDisponible(tx, periodoId);
    const existente = await tx.nomina.findUnique({ where: { periodoId } });
    if (existente && existente.estado !== "FALLIDA")
      throw new TRPCError({
        code: "CONFLICT",
        message: "El período ya tiene una generación registrada.",
      });
    const fiscal = await tx.parametroFiscalNomina.findUnique({
      where: { anio: periodo.anio },
    });
    if (!fiscal)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Faltan los parámetros fiscales aprobados para ${periodo.anio}.`,
      });
    const inicio = new Date(Date.UTC(periodo.anio, periodo.mes - 1, 1));
    const fin = new Date(Date.UTC(periodo.anio, periodo.mes, 0));
    const empleados = await tx.empleado.findMany({
      where: {
        OR: [
          {
            estado: "ACTIVO",
            fechaIngreso: { lte: fin },
            OR: [{ fechaSalida: null }, { fechaSalida: { gte: inicio } }],
          },
          {
            estado: "INACTIVO",
            OR: [
              { novedades: { some: { periodoId } } },
              { compras: { some: { periodoId } } },
              {
                ausencias: {
                  some: {
                    estado: "APROBADA",
                    fechaInicio: { lte: fin },
                    fechaFin: { gte: inicio },
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        departamento: true,
        novedades: { where: { periodoId }, orderBy: { id: "asc" } },
        compras: { where: { periodoId }, orderBy: { id: "asc" } },
        ausencias: {
          where: {
            estado: "APROBADA",
            aCuentaSalario: true,
            fechaInicio: { lte: fin },
            fechaFin: { gte: inicio },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });
    if (!empleados.length)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No hay empleados para generar la nómina del período.",
      });
    if (empleados.some((e) => e.estado === "INACTIVO" && !e.fechaSalida))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Hay empleados inactivos sin fecha de baja. Completa sus datos antes de generar.",
      });
    const usuario = await tx.usuario.findUniqueOrThrow({
      where: { id: gestor.id },
      select: { nombre: true },
    });
    const datos = {
      usuarioId: gestor.id,
      solicitante: usuario.nombre,
      estado: "PENDIENTE" as const,
      fechaSolicitud: new Date(),
      fechaInicio: null,
      fechaFin: null,
      sesionSolicitudId: actor.sesionId,
      error: null,
      reglas: {
        version: "2026-10-v1",
        deduccionAnual: fiscal.deduccionAnual.toFixed(2),
        referenciaFiscal: fiscal.referencia,
        igssLaboral: "0.0483",
        igssPatronal: "0.1067",
        solidaridad: "0.03",
        anticipo: "0.50",
        bonificacion: "250.00",
        isr: "Proyección mensual anualizada, sin antecedentes externos; cuota de referencia anterior a baja/ausencias.",
        dias: "30/360: día 31 sin peso; último día de febrero completa 30.",
      },
    };
    const nomina = existente
      ? await tx.nomina.update({ where: { id: existente.id }, data: datos })
      : await tx.nomina.create({ data: { ...datos, periodoId } });
    if (existente)
      await tx.detalleNomina.deleteMany({ where: { nominaId: nomina.id } });
    const fecha = (d: Date) => d.toISOString().slice(0, 10);
    await tx.detalleNomina.createMany({
      data: empleados.map((e) => ({
        nominaId: nomina.id,
        empleadoId: e.id,
        codigo: e.codigo,
        nombre: e.nombre,
        departamento: e.departamento.nombre,
        cuentaContable: e.departamento.cuentaContable,
        salarioBase: e.salarioBase,
        entrada: {
          ingreso: fecha(e.fechaIngreso),
          salida: e.fechaSalida ? fecha(e.fechaSalida) : null,
          estado: e.estado,
          departamentoId: e.departamentoId,
          versionEmpleado: e.version,
          novedades: e.novedades.map((n) => ({
            id: n.id,
            tipo: n.tipo,
            cantidad: n.cantidad.toFixed(2),
            departamentoId: n.departamentoId,
            usuarioId: n.usuarioId,
          })),
          compras: e.compras.map((c) => ({
            id: c.id,
            monto: c.monto.toFixed(2),
            detalle: c.detalle,
            version: c.version,
            usuarioId: c.usuarioRegistroId,
          })),
          ausencias: e.ausencias.map((a) => ({
            id: a.id,
            inicio: fecha(a.fechaInicio),
            fin: fecha(a.fechaFin),
            version: a.version,
          })),
        },
      })),
    });
    await tx.periodoNomina.update({
      where: { id: periodoId },
      data: { estado: "PROCESANDO" },
    });
    return { id: nomina.id };
  });
}

function rangoPeriodos(
  desde?: string,
  hasta?: string,
): Prisma.PeriodoNominaWhereInput {
  const limite = (valor: string) => ({
    anio: Number(valor.slice(0, 4)),
    mes: Number(valor.slice(5, 7)),
  });
  const a = desde ? limite(desde) : null,
    b = hasta ? limite(hasta) : null;
  return {
    AND: [
      ...(a
        ? [
            {
              OR: [
                { anio: { gt: a.anio } },
                { anio: a.anio, mes: { gte: a.mes } },
              ],
            },
          ]
        : []),
      ...(b
        ? [
            {
              OR: [
                { anio: { lt: b.anio } },
                { anio: b.anio, mes: { lte: b.mes } },
              ],
            },
          ]
        : []),
    ],
  };
}

export async function listarNominas(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof filtroNominaSchema>,
  propia = false,
) {
  const data = validar(filtroNominaSchema, input);
  const gestor = await autorizarNomina(
    db,
    actor,
    propia ? undefined : "PAYROLL.VIEW",
    propia,
  );
  const where: Prisma.NominaWhereInput = {
    periodo: rangoPeriodos(data.desde, data.hasta),
    ...(propia
      ? {
          estado: "COMPLETADA",
          detalles: { some: { empleadoId: gestor.empleado!.id } },
        }
      : {}),
  };
  const [total, filas] = await Promise.all([
    db.nomina.count({ where }),
    db.nomina.findMany({
      where,
      include: { periodo: true, _count: { select: { detalles: true } } },
      orderBy: [
        { periodo: { anio: "desc" } },
        { periodo: { mes: "desc" } },
        { id: "desc" },
      ],
      skip: (data.pagina - 1) * 15,
      take: 15,
    }),
  ]);
  // Self service must never disclose company totals or other employees' counts.
  if (propia) {
    const detalles = await db.detalleNomina.findMany({
      where: {
        nominaId: { in: filas.map((f) => f.id) },
        empleadoId: gestor.empleado!.id,
      },
    });
    return {
      total,
      filas: filas.map((f) => {
        const d = detalles.find((d) => d.nominaId === f.id)!;
        return {
          id: f.id,
          periodo: f.periodo,
          estado: f.estado,
          fechaFin: f.fechaFin,
          totalPago: d.pagoFinal.toFixed(2),
          totalIngresos: d.totalIngresos.toFixed(2),
          totalEgresos: d.totalEgresos.toFixed(2),
          cantidad: 1,
        };
      }),
    };
  }
  return {
    total,
    filas: filas.map((f) => ({
      id: f.id,
      periodo: f.periodo,
      estado: f.estado,
      fechaFin: f.fechaFin,
      totalPago: f.totalPago.toFixed(2),
      totalIngresos: f.totalIngresos.toFixed(2),
      totalEgresos: f.totalEgresos.toFixed(2),
      cantidad: f._count.detalles,
    })),
  };
}

export async function detalleNomina(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof detalleNominaSchema>,
  propia = false,
) {
  const { id, pagina } = validar(detalleNominaSchema, input);
  const gestor = await autorizarNomina(
    db,
    actor,
    propia ? undefined : "PAYROLL.DETAIL",
    propia,
  );
  const nomina = await db.nomina.findFirst({
    where: {
      id,
      estado: "COMPLETADA",
      ...(propia
        ? { detalles: { some: { empleadoId: gestor.empleado!.id } } }
        : {}),
    },
    include: { periodo: true },
  });
  if (!nomina)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "La nómina no está disponible.",
    });
  const where = {
    nominaId: id,
    ...(propia ? { empleadoId: gestor.empleado!.id } : {}),
  };
  const [total, filas] = await Promise.all([
    db.detalleNomina.count({ where }),
    db.detalleNomina.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (pagina - 1) * 15,
      take: 15,
    }),
  ]);
  return {
    nomina: {
      id,
      periodo: nomina.periodo,
      fechaFin: nomina.fechaFin,
      mesGeneracion: nomina.mesGeneracion,
      solicitante: nomina.solicitante,
      reglas: nomina.reglas,
    },
    total,
    filas: filas.map(decimales),
  };
}

export async function exportarNomina(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof idNominaSchema>,
) {
  const { id } = validar(idNominaSchema, input);
  await autorizarNomina(db, actor, "PAYROLL.EXPORT");
  const nomina = await db.nomina.findFirst({
    where: { id, estado: "COMPLETADA" },
    include: { periodo: true, detalles: { orderBy: { codigo: "asc" } } },
  });
  if (!nomina)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Solo se exportan nóminas completadas.",
    });
  return {
    nombre: `nomina-${nomina.periodo.anio}-${String(nomina.periodo.mes).padStart(2, "0")}.csv`,
    contenido: csvNomina(
      nomina.detalles.map(decimales),
      `${nomina.periodo.anio}-${String(nomina.periodo.mes).padStart(2, "0")}`,
    ),
  };
}

export async function seguimientoNomina(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof idNominaSchema>,
) {
  const { id } = validar(idNominaSchema, input);
  const gestor = await autorizarNomina(db, actor);
  const ejecucion = await db.nomina.findFirst({
    where: { id, usuarioId: gestor.id, sesionSolicitudId: actor.sesionId },
    select: {
      id: true,
      estado: true,
      periodo: { select: { mes: true, anio: true } },
    },
  });
  if (!ejecucion)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No tienes una ejecución iniciada en esta sesión.",
    });
  return ejecucion;
}

export async function ejecucionesPropias(db: PrismaClient, actor: ActorAcceso) {
  const gestor = await autorizarNomina(db, actor, "PAYROLL.PROCESS");
  return db.nomina.findMany({
    where: { usuarioId: gestor.id },
    select: {
      id: true,
      estado: true,
      error: true,
      fechaSolicitud: true,
      fechaInicio: true,
      fechaFin: true,
      intentos: true,
      periodo: { select: { mes: true, anio: true } },
    },
    orderBy: { fechaSolicitud: "desc" },
    take: 10,
  });
}
