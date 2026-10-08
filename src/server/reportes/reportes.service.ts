import { Prisma, type PrismaClient, type ReportePoliza } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";
import { transaccionAcceso } from "~/server/permisos/Helpers/acceso-policy";
import { transaccionOrganizacion } from "~/server/empleados/Helpers/organizacion.helper";
import { autorizarPoliza } from "./reportes.policy";
import {
  agruparPoliza,
  conceptosPoliza,
  huellaPoliza,
} from "./Helpers/poliza.helper";
import { celdaCsv } from "~/server/nomina/Helpers/csv.helper";
import {
  datosPolizaSchema,
  periodoPolizaSchema,
  generarPolizaSchema,
  exportarPolizaSchema,
  type DocumentoPoliza,
} from "./Models/poliza.schema";

function validar<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.output<T> {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Revisa el período y los datos del reporte.",
    });
  return r.data as z.output<T>;
}
function desdeGuardado(r: ReportePoliza): DocumentoPoliza {
  return {
    reporteId: r.id,
    fechaGeneracion: r.fechaGeneracion,
    generadoPor: r.generadoPor,
    datos: datosPolizaSchema.parse(r.datos),
  };
}
async function preparar(
  tx: Prisma.TransactionClient,
  periodoId: number,
): Promise<DocumentoPoliza> {
  const nomina = await tx.nomina.findUnique({
    where: { periodoId },
    include: { periodo: true, reportePoliza: true },
  });
  if (nomina?.estado !== "COMPLETADA" || nomina.periodo.estado !== "CERRADO")
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Selecciona un período cerrado con nómina completada.",
    });
  if (nomina.reportePoliza) return desdeGuardado(nomina.reportePoliza);
  const [detalles, departamentos] = await Promise.all([
    tx.detalleNomina.findMany({
      where: { nominaId: nomina.id },
      orderBy: { id: "asc" },
    }),
    tx.departamento.findMany({
      select: { id: true, nombre: true, cuentaContable: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!detalles.length)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La nómina no contiene detalles para el reporte.",
    });
  const datos = agruparPoliza(
    nomina.periodo,
    nomina.id,
    detalles,
    departamentos,
  );
  const controles = [
    [datos.totales.totalIngresos, nomina.totalIngresos],
    [datos.totales.totalEgresos, nomina.totalEgresos],
    [datos.totales.anticipo, nomina.totalAnticipo],
    [datos.totales.pagoFinal, nomina.totalPago],
    [datos.totales.igssPatronal, nomina.totalPatronal],
  ] as const;
  if (controles.some(([a, b]) => !new Prisma.Decimal(a).equals(b)))
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Los detalles no coinciden con los totales de nómina. Revisa la información de origen.",
    });
  return { datos, reporteId: null, generadoPor: null, fechaGeneracion: null };
}
export async function contextoReportes(db: PrismaClient, actor: ActorAcceso) {
  const gestor = await autorizarPoliza(db, actor);
  const periodos = await db.periodoNomina.findMany({
    where: { estado: "CERRADO", nomina: { estado: "COMPLETADA" } },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
    select: {
      id: true,
      mes: true,
      anio: true,
      nomina: {
        select: {
          reportePoliza: { select: { id: true, fechaGeneracion: true } },
        },
      },
    },
  });
  return { periodos, permisos: gestor.permisos };
}
export async function vistaPreviaPoliza(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof periodoPolizaSchema>,
) {
  const { periodoId } = validar(periodoPolizaSchema, input);
  const documento = await db.$transaction(
    async (tx) => {
      await autorizarPoliza(tx, actor);
      return preparar(tx, periodoId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const { pdfPoliza } = await import("./Helpers/poliza-pdf");
  return {
    ...documento,
    huella: huellaPoliza(documento.datos),
    pdf: (await pdfPoliza(documento)).toString("base64"),
  };
}
export async function generarPoliza(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof generarPolizaSchema>,
) {
  const { periodoId, huella } = validar(generarPolizaSchema, input);
  // Same organization -> security lock order as payroll; PDF rendering stays outside the transaction.
  return transaccionOrganizacion(db, (tx) =>
    transaccionAcceso(
      tx,
      actor,
      ["ACCOUNTING_POLICY.VIEW", "ACCOUNTING_POLICY.GENERATE"],
      async (tx, gestor) => {
        const documento = await preparar(tx, periodoId);
        if (documento.reporteId) return { id: documento.reporteId };
        if (huellaPoliza(documento.datos) !== huella)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "La configuración cambió. Actualiza y revisa la vista previa antes de generar.",
          });
        const usuario = await tx.usuario.findUniqueOrThrow({
          where: { id: gestor.id },
          select: { nombre: true },
        });
        const reporte = await tx.reportePoliza.create({
          data: {
            nominaId: documento.datos.nominaId,
            usuarioId: gestor.id,
            generadoPor: usuario.nombre,
            datos: documento.datos,
          },
        });
        return { id: reporte.id };
      },
    ),
  );
}
export async function exportarPoliza(
  db: PrismaClient,
  actor: ActorAcceso,
  input: z.input<typeof exportarPolizaSchema>,
) {
  const { periodoId, formato } = validar(exportarPolizaSchema, input);
  await autorizarPoliza(db, actor, "EXPORT");
  const guardado = await db.reportePoliza.findFirst({
    where: { nomina: { periodoId } },
  });
  if (!guardado)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Genera el reporte después de revisar la vista previa.",
    });
  const documento = desdeGuardado(guardado);
  const { datos } = documento;
  const periodo = `${datos.anio}-${String(datos.mes).padStart(2, "0")}`;
  let contenido: Buffer;
  if (formato === "pdf") {
    const { pdfPoliza } = await import("./Helpers/poliza-pdf");
    contenido = await pdfPoliza(documento);
  } else {
    const filas = [
      [
        "Reporte",
        "Período",
        "Generado por",
        "Fecha de generación (UTC)",
        "Sección",
        "Cuenta",
        "Departamento",
        "Concepto",
        "Clasificación",
        "Importe (GTQ)",
      ]
        .map((v) => celdaCsv(v, true))
        .join(","),
    ];
    const agregar = (
      seccion: string,
      cuenta: string | null,
      departamento: string,
      importes: typeof datos.totales,
    ) => {
      for (const [campo, nombre, clasificacion] of conceptosPoliza)
        filas.push(
          [
            String(guardado.id),
            periodo,
            guardado.generadoPor,
            guardado.fechaGeneracion.toISOString(),
            seccion,
            cuenta ?? "Sin cuenta histórica",
            departamento,
            nombre,
            clasificacion,
          ]
            .map((v) => celdaCsv(v, true))
            .concat(celdaCsv(importes[campo]))
            .join(","),
        );
    };
    for (const grupo of datos.grupos)
      agregar(
        grupo.sinMovimientos ? "Departamento sin movimientos" : "Departamento",
        grupo.cuenta,
        grupo.departamento,
        grupo.importes,
      );
    for (const cuenta of datos.cuentas)
      agregar("Resumen por cuenta", cuenta.cuenta, "", cuenta.importes);
    agregar("Total general", "", "", datos.totales);
    contenido = Buffer.from("\uFEFF" + filas.join("\r\n") + "\r\n", "utf8");
  }
  return {
    nombre: `poliza-${periodo}.${formato}`,
    tipo: formato === "pdf" ? "application/pdf" : "text/csv;charset=utf-8",
    base64: contenido.toString("base64"),
  };
}
