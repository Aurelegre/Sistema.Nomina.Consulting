import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { DocumentoPoliza, ImportesPoliza } from "../Models/poliza.schema";
import { conceptosPoliza } from "./poliza.helper";

const estilos = StyleSheet.create({
  pagina: {
    padding: 36,
    paddingBottom: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#172033",
  },
  marca: { fontSize: 10, color: "#475569", marginBottom: 7 },
  titulo: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  subtitulo: { fontSize: 11, marginBottom: 5 },
  nota: { fontSize: 8, color: "#475569", lineHeight: 1.5, marginBottom: 12 },
  encabezado: {
    backgroundColor: "#172033",
    color: "#ffffff",
    padding: 9,
    marginTop: 10,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbe2ea",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  concepto: { width: "43%", paddingRight: 5 },
  clasificacion: {
    width: "35%",
    fontSize: 8,
    color: "#475569",
    paddingRight: 5,
  },
  importe: { width: "22%", textAlign: "right" },
  subtotal: { backgroundColor: "#eff4f8", fontFamily: "Helvetica-Bold" },
  pie: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
  },
});
// Format decimal strings without converting money to floating point.
function dinero(valor: string) {
  const [entero, centavos] = valor.split(".");
  return `Q ${entero!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${centavos}`;
}
function Tabla({ importes }: { importes: ImportesPoliza }) {
  return (
    <View>
      <View style={[estilos.fila, estilos.subtotal]}>
        <Text style={estilos.concepto}>Concepto</Text>
        <Text style={estilos.clasificacion}>Clasificación informativa</Text>
        <Text style={estilos.importe}>Importe (GTQ)</Text>
      </View>
      {conceptosPoliza.map(([campo, nombre, clasificacion]) => (
        <View
          key={campo}
          wrap={false}
          style={[
            estilos.fila,
            ...(["totalIngresos", "totalEgresos", "pagoFinal"].includes(campo)
              ? [estilos.subtotal]
              : []),
          ]}
        >
          <Text style={estilos.concepto}>{nombre}</Text>
          <Text style={estilos.clasificacion}>{clasificacion}</Text>
          <Text
            style={[
              estilos.importe,
              {
                color: importes[campo].startsWith("-") ? "#b91c1c" : "#172033",
              },
            ]}
          >
            {dinero(importes[campo])}
          </Text>
        </View>
      ))}
    </View>
  );
}
export async function pdfPoliza(documento: DocumentoPoliza) {
  const { datos, reporteId, generadoPor, fechaGeneracion } = documento;
  const periodo = new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(datos.anio, datos.mes - 1, 1)));
  const secciones = [
    {
      titulo: "Totales generales",
      descripcion:
        "Consolidado de la nómina. Los subtotales no deben sumarse nuevamente.",
      importes: datos.totales,
    },
    ...datos.grupos.map((g) => ({
      titulo: `${g.departamento} | Cuenta: ${g.cuenta ?? "Sin cuenta histórica"}`,
      descripcion: g.sinMovimientos
        ? "Cuenta sin movimientos en esta nómina: importes en cero."
        : `${g.empleados} empleado(s) incluidos en la nómina.`,
      importes: g.importes,
    })),
    ...datos.cuentas.map((c) => ({
      titulo: `Resumen por cuenta: ${c.cuenta ?? "Sin cuenta histórica"}`,
      descripcion: "Consolidado de los departamentos asociados a esta cuenta.",
      importes: c.importes,
    })),
  ];
  return renderToBuffer(
    <Document
      title={`Póliza contable - ${periodo}`}
      author="Consulting, S.A."
      creationDate={
        fechaGeneracion ?? new Date(Date.UTC(datos.anio, datos.mes - 1, 1))
      }
      modificationDate={
        fechaGeneracion ?? new Date(Date.UTC(datos.anio, datos.mes - 1, 1))
      }
    >
      {secciones.map((seccion, i) => (
        <Page key={i} size="A4" style={estilos.pagina}>
          <Text style={estilos.marca}>
            CONSULTING, S.A. / REPORTES DE NÓMINA
          </Text>
          <Text style={estilos.titulo}>Póliza contable agrupada</Text>
          <Text style={estilos.subtitulo}>
            {periodo} | Nómina #{datos.nominaId} |{" "}
            {reporteId ? `Reporte #${reporteId}` : "Vista previa - sin guardar"}
          </Text>
          <Text style={estilos.nota}>
            {fechaGeneracion
              ? `Generado por ${generadoPor} el ${new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(fechaGeneracion)} (Guatemala).`
              : "Revise esta vista previa antes de generar el reporte."}
          </Text>
          <Text style={estilos.encabezado}>{seccion.titulo}</Text>
          <Text style={[estilos.nota, { marginTop: 8 }]}>
            {seccion.descripcion}
          </Text>
          <Tabla importes={seccion.importes} />
          <Text style={[estilos.nota, { marginTop: 16 }]}>
            Obligaciones según el cierre de nómina; no acredita pagos
            posteriores. El anticipo quincenal ya está aplicado. Los negativos
            se conservan en rojo, sin reclasificación ni arrastre.
          </Text>
          {datos.grupos.some((g) => g.cuenta === null) && (
            <Text style={estilos.nota}>
              Sin cuenta histórica: se conservan los importes originales, sin
              trasladarlos a cuentas nuevas.
            </Text>
          )}
          <Text
            fixed
            style={estilos.pie}
            render={({ pageNumber, totalPages }) =>
              `Póliza agrupada | ${pageNumber} / ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>,
  );
}
