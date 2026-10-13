import {
  Prisma,
  type PrismaClient,
  type ReporteTributario,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { transaccionAcceso } from "~/server/permisos/Helpers/acceso-policy";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { autorizarTributario, permisosTributario } from "./tributario.policy";
import {
  agruparTributario,
  huellaTributario,
} from "./Helpers/tributario.helper";
import { celdaCsv } from "~/server/nomina/Helpers/csv.helper";
import {
  REPORTES_TRIBUTARIOS,
  type TipoReporte,
} from "~/shared/reportes-tributarios";
import {
  datosTributarioSchema,
  tipoTributarioSchema,
  periodoTributarioSchema,
  generarTributarioSchema,
  exportarTributarioSchema,
  type DocumentoTributario,
} from "./Models/tributario.schema";
function validar<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.output<T> {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Revisa el tipo de reporte y el período.",
    });
  return r.data as z.output<T>;
}
function desdeGuardado(r: ReporteTributario): DocumentoTributario {
  return {
    reporteId: r.id,
    generadoPor: r.generadoPor,
    fechaGeneracion: r.fechaGeneracion,
    datos: datosTributarioSchema.parse(r.datos),
  };
}
async function preparar(
  tx: Prisma.TransactionClient,
  periodoId: number,
  tipo: TipoReporte,
): Promise<DocumentoTributario> {
  const nomina = await tx.nomina.findUnique({
    where: { periodoId },
    include: { periodo: true, reportesTributarios: { where: { tipo } } },
  });
  if (nomina?.estado !== "COMPLETADA" || nomina.periodo.estado !== "CERRADO")
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Selecciona un período cerrado con nómina completada.",
    });
  const existente = nomina.reportesTributarios[0];
  if (existente) return desdeGuardado(existente);
  const [detalles, departamentos] = await Promise.all([
    tx.detalleNomina.findMany({
      where: { nominaId: nomina.id },
      orderBy: { id: "asc" },
    }),
    tx.departamento.findMany({
      select: { id: true, nombre: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!detalles.length)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La nómina no contiene detalles.",
    });
  const datos = agruparTributario(
    tipo,
    nomina.periodo,
    nomina.id,
    detalles,
    departamentos,
  );
  // Reconcile the grouped output with the immutable source. Never calculate taxes.
  const campo =
    tipo === "ISR"
      ? "isr"
      : tipo === "IGSS_LABORAL"
        ? "igssLaboral"
        : "igssPatronal";
  const total = detalles.reduce(
    (s, d) => s.plus(d[campo]),
    new Prisma.Decimal(0),
  );
  if (
    !total.equals(datos.importe) ||
    (tipo === "IGSS_PATRONAL" && !total.equals(nomina.totalPatronal))
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Los totales del reporte no coinciden con la nómina.",
    });
  return { datos, reporteId: null, generadoPor: null, fechaGeneracion: null };
}
export async function contextoTributario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof tipoTributarioSchema>,
) {
  const { tipo } = validar(tipoTributarioSchema, input);
  const gestor = await autorizarTributario(db, actor, tipo);
  const periodos = await db.periodoNomina.findMany({
    where: { estado: "CERRADO", nomina: { estado: "COMPLETADA" } },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
    select: {
      id: true,
      mes: true,
      anio: true,
      nomina: {
        select: {
          reportesTributarios: {
            where: { tipo },
            select: { id: true, fechaGeneracion: true },
          },
        },
      },
    },
  });
  return { periodos, permisos: gestor.permisos };
}
export async function vistaPreviaTributario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof periodoTributarioSchema>,
) {
  const { tipo, periodoId } = validar(periodoTributarioSchema, input);
  const documento = await db.$transaction(
    async (tx) => {
      await autorizarTributario(tx, actor, tipo);
      return preparar(tx, periodoId, tipo);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const { pdfTributario } = await import("./Helpers/tributario-pdf");
  return {
    ...documento,
    huella: huellaTributario(documento.datos),
    pdf: (await pdfTributario(documento)).toString("base64"),
  };
}
export async function generarTributario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof generarTributarioSchema>,
) {
  const { tipo, periodoId, huella } = validar(generarTributarioSchema, input);
  return transaccionOrganizacion(db, (tx) =>
    transaccionAcceso(
      tx,
      actor,
      permisosTributario(tipo, "GENERATE"),
      async (tx, gestor) => {
        const documento = await preparar(tx, periodoId, tipo);
        if (documento.reporteId) return { id: documento.reporteId };
        if (huellaTributario(documento.datos) !== huella)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "La información cambió. Actualiza y revisa la vista previa antes de generar.",
          });
        const usuario = await tx.usuario.findUniqueOrThrow({
          where: { id: gestor.id },
          select: { nombre: true },
        });
        const r = await tx.reporteTributario.create({
          data: {
            nominaId: documento.datos.nominaId,
            tipo,
            usuarioId: gestor.id,
            generadoPor: usuario.nombre,
            datos: documento.datos,
          },
        });
        return { id: r.id };
      },
    ),
  );
}
export async function exportarTributario(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof exportarTributarioSchema>,
) {
  const { tipo, periodoId, formato } = validar(exportarTributarioSchema, input);
  await autorizarTributario(db, actor, tipo, "EXPORT");
  const r = await db.reporteTributario.findFirst({
    where: { tipo, nomina: { periodoId } },
  });
  if (!r)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Genera el reporte después de revisar la vista previa.",
    });
  const documento = desdeGuardado(r),
    { datos } = documento,
    config = REPORTES_TRIBUTARIOS[tipo];
  const periodo = `${datos.anio}-${String(datos.mes).padStart(2, "0")}`;
  let contenido: Buffer;
  if (formato === "pdf") {
    const { pdfTributario } = await import("./Helpers/tributario-pdf");
    contenido = await pdfTributario(documento);
  } else {
    const filas = [
      [
        "Reporte",
        "Tipo",
        "Período",
        "Generado por",
        "Fecha (UTC)",
        "Sección",
        "Departamento",
        "Código",
        "Empleado",
        "Días laborados",
        config.base,
        ...(tipo === "ISR" ? ["Renta imponible anual proyectada"] : []),
        config.importe,
      ]
        .map((v) => celdaCsv(v, true))
        .join(","),
    ];
    const agregar = (
      seccion: string,
      departamento: string,
      codigo: string,
      nombre: string,
      dias: string,
      base: string,
      renta: string,
      importe: string,
    ) => {
      filas.push(
        [
          r.id.toString(),
          config.titulo,
          periodo,
          r.generadoPor,
          r.fechaGeneracion.toISOString(),
          seccion,
          departamento,
          codigo,
          nombre,
        ]
          .map((v) => celdaCsv(v, true))
          .concat(
            [dias, base, ...(tipo === "ISR" ? [renta] : []), importe].map((v) =>
              celdaCsv(v),
            ),
          )
          .join(","),
      );
    };
    for (const g of datos.grupos) {
      for (const f of g.filas)
        agregar(
          "Empleado",
          g.departamento,
          f.codigo,
          f.nombre,
          String(f.diasLaborados),
          f.base,
          f.rentaAnual ?? "",
          f.importe,
        );
      agregar(
        g.filas.length
          ? "Subtotal departamento"
          : "Departamento sin movimientos",
        g.departamento,
        "",
        "",
        "",
        g.base,
        "",
        g.importe,
      );
    }
    agregar("Total general", "", "", "", "", datos.base, "", datos.importe);
    contenido = Buffer.from("\uFEFF" + filas.join("\r\n") + "\r\n", "utf8");
  }
  return {
    nombre: `${config.ruta}-${periodo}.${formato}`,
    tipo: formato === "pdf" ? "application/pdf" : "text/csv;charset=utf-8",
    base64: contenido.toString("base64"),
  };
}
