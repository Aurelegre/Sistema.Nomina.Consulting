import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { autorizarCumpleaneros } from "./cumpleaneros.policy";
import {
  filtrosCumpleanerosSchema,
  exportarCumpleanerosSchema,
  type FiltrosCumpleaneros,
  type FilaCumpleaneros,
} from "./Models/cumpleaneros.schema";
import {
  mesesCumpleaneros,
  estadosCumpleaneros,
  fechaCumpleanos,
} from "~/shared/cumpleaneros";
import { celdaCsv } from "~/server/nomina/Helpers/csv.helper";
export async function contextoCumpleaneros(
  db: PrismaClient,
  actor: ActorAcceso,
) {
  const gestor = await autorizarCumpleaneros(db, actor);
  const departamentos = await db.departamento.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const mes = Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "America/Guatemala",
    }).format(new Date()),
  );
  return {
    departamentos,
    mes,
    puedeExportar: gestor.permisos.includes("BIRTHDAYS_REPORT.EXPORT"),
  };
}
async function consultar(db: PrismaClient, f: FiltrosCumpleaneros) {
  const departamento = f.departamentoId
    ? await db.departamento.findUnique({
        where: { id: f.departamentoId },
        select: { nombre: true },
      })
    : null;
  if (f.departamentoId && !departamento)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "El departamento seleccionado no existe.",
    });
  // SQL parametrizado: filtrar por mes sin exponer fecha completa ni salarios.
  const filas = await db.$queryRaw<FilaCumpleaneros[]>(Prisma.sql`
 SELECT e.codigo,e.nombre,d.nombre AS departamento,DAY(e.fecha_nacimiento) AS dia
 FROM empleado e INNER JOIN departamento d ON d.id=e.departamento_id
 WHERE MONTH(e.fecha_nacimiento)=${f.mes}
 ${f.estado === "TODOS" ? Prisma.empty : Prisma.sql`AND e.estado=${f.estado}`}
 ${f.departamentoId ? Prisma.sql`AND e.departamento_id=${f.departamentoId}` : Prisma.empty}
 ORDER BY DAY(e.fecha_nacimiento),e.nombre,e.codigo`);
  return {
    filas: filas.map((r) => ({ ...r, dia: Number(r.dia) })),
    total: filas.length,
    mes: f.mes,
    mesNombre: mesesCumpleaneros[f.mes - 1]!.nombre,
    estado: estadosCumpleaneros[f.estado],
    departamento: departamento?.nombre ?? "Todos los departamentos",
  };
}
export async function listarCumpleaneros(
  db: PrismaClient,
  actor: ActorAcceso,
  input: unknown,
) {
  await autorizarCumpleaneros(db, actor);
  const f = filtrosCumpleanerosSchema.safeParse(input);
  if (!f.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Revisa los filtros del reporte.",
    });
  return consultar(db, f.data);
}
export async function exportarCumpleaneros(
  db: PrismaClient,
  actor: ActorAcceso,
  input: unknown,
) {
  await autorizarCumpleaneros(db, actor, true);
  const f = exportarCumpleanerosSchema.safeParse(input);
  if (!f.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Revisa los filtros y formato del reporte.",
    });
  const datos = await consultar(db, f.data);
  let contenido: Buffer;
  if (f.data.formato === "pdf") {
    const { pdfCumpleaneros } = await import("./Helpers/cumpleaneros-pdf");
    contenido = await pdfCumpleaneros(datos);
  } else {
    const filas = [
      [
        "Mes",
        "Estado seleccionado",
        "Departamento seleccionado",
        "Código",
        "Empleado",
        "Departamento",
        "Cumpleaños",
      ],
      ...datos.filas.map((r) => [
        datos.mesNombre,
        datos.estado,
        datos.departamento,
        r.codigo,
        r.nombre,
        r.departamento,
        fechaCumpleanos(r.dia, datos.mes),
      ]),
    ];
    contenido = Buffer.from(
      "\uFEFF" +
        filas
          .map((fila) => fila.map((v) => celdaCsv(v, true)).join(","))
          .join("\r\n") +
        "\r\n",
      "utf8",
    );
  }
  return {
    nombre: `cumpleaneros-${String(datos.mes).padStart(2, "0")}.${f.data.formato}`,
    tipo:
      f.data.formato === "pdf" ? "application/pdf" : "text/csv;charset=utf-8",
    base64: contenido.toString("base64"),
  };
}
export type ReporteCumpleaneros = Awaited<
  ReturnType<typeof listarCumpleaneros>
>;
