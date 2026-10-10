import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReporteCumpleaneros } from "../cumpleaneros.service";
import { fechaCumpleanos } from "~/shared/cumpleaneros";
const s = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 45,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#172033",
  },
  title: { fontSize: 22, marginVertical: 10 },
  meta: { fontSize: 10, marginBottom: 12, lineHeight: 1.5 },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbe2ea",
  },
  header: { backgroundColor: "#eff4f8", fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    textAlign: "right",
    fontSize: 8,
    color: "#64748b",
  },
});
function Celda({ valor, width }: { valor: string; width: string }) {
  return (
    <Text
      hyphenationCallback={(word) => [...word]}
      style={{ width, paddingHorizontal: 5 }}
    >
      {valor}
    </Text>
  );
}
export function pdfCumpleaneros(d: ReporteCumpleaneros) {
  return renderToBuffer(
    <Document title={"Cumpleañeros - " + d.mesNombre} author="Consulting, S.A.">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View fixed>
          <Text>CONSULTING, S.A. / REPORTES</Text>
          <Text style={s.title}>Cumpleañeros de {d.mesNombre}</Text>
          <Text style={s.meta}>
            {d.estado} | {d.departamento}
            {"\n"}Total: {d.total} empleados
          </Text>
          <View style={[s.row, s.header]}>
            <Celda width="18%" valor="Código" />
            <Celda width="35%" valor="Empleado" />
            <Celda width="32%" valor="Departamento" />
            <Celda width="15%" valor="Cumpleaños" />
          </View>
        </View>
        {d.filas.map((r, i) => (
          <View key={i} wrap={false} style={s.row}>
            <Celda width="18%" valor={r.codigo} />
            <Celda width="35%" valor={r.nombre} />
            <Celda width="32%" valor={r.departamento} />
            <Celda width="15%" valor={fechaCumpleanos(r.dia, d.mes)} />
          </View>
        ))}
        {!d.total && (
          <Text style={{ marginTop: 16 }}>
            No hay cumpleañeros con los filtros seleccionados.
          </Text>
        )}
        <Text
          fixed
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Consulta de datos actuales | ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>,
  );
}
