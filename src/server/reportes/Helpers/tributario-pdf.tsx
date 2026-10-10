import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { DocumentoTributario } from "../Models/tributario.schema";
import { REPORTES_TRIBUTARIOS } from "~/shared/reportes-tributarios";
const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 165,
    paddingHorizontal: 30,
    paddingBottom: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#172033",
  },
  cabecera: { position: "absolute", top: 30, left: 30, right: 30 },
  titulo: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 7,
  },
  nota: { fontSize: 8, color: "#475569", lineHeight: 1.4, marginTop: 5 },
  banda: {
    backgroundColor: "#172033",
    color: "white",
    padding: 7,
    marginTop: 8,
    fontSize: 10,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbe2ea",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  total: { backgroundColor: "#eff4f8", fontFamily: "Helvetica-Bold" },
  pie: {
    position: "absolute",
    bottom: 18,
    right: 30,
    left: 30,
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
  },
});
const dinero = (s: string) => {
  const [a, b] = s.split(".");
  return `Q ${a!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${b}`;
};
function Celda({
  valor,
  ancho,
  dinero: esDinero = false,
}: {
  valor: string;
  ancho: string;
  dinero?: boolean;
}) {
  return (
    <Text
      hyphenationCallback={(palabra) => [...palabra]}
      style={{
        width: ancho,
        paddingRight: 5,
        fontSize: 8,
        textAlign: esDinero ? "right" : "left",
        color: esDinero && valor.startsWith("-") ? "#b91c1c" : "#172033",
      }}
    >
      {esDinero ? dinero(valor) : valor}
    </Text>
  );
}
export async function pdfTributario(doc: DocumentoTributario) {
  const { datos: d } = doc,
    c = REPORTES_TRIBUTARIOS[d.tipo],
    isr = d.tipo === "ISR";
  const periodo = new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(d.anio, d.mes - 1, 1)));
  const fecha = doc.fechaGeneracion ?? new Date(Date.UTC(d.anio, d.mes - 1, 1));
  const Cabecera = ({
    seccion,
    resumen = false,
  }: {
    seccion: string;
    resumen?: boolean;
  }) => (
    <View fixed style={estilos.cabecera}>
      <Text>CONSULTING, S.A. / REPORTES INTERNOS</Text>
      <Text style={estilos.titulo}>{c.titulo}</Text>
      <Text>
        {periodo} | Nómina #{d.nominaId} |{" "}
        {doc.reporteId
          ? `Reporte #${doc.reporteId}`
          : "Vista previa - sin guardar"}
      </Text>
      <Text style={estilos.nota}>
        {doc.fechaGeneracion
          ? `Generado por ${doc.generadoPor} el ${new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(fecha)} (Guatemala).`
          : "Revise los datos antes de generar el reporte."}
      </Text>
      <Text style={estilos.nota}>
        {isr
          ? "La renta imponible es una proyección anual. El total corresponde a retenciones mensuales."
          : "Importes aplicados en nómina, sin recalcular. Incluye empleados con cuota cero."}
      </Text>
      <Text style={estilos.banda}>{seccion}</Text>
      <View style={[estilos.fila, estilos.total]}>
        {resumen ? (
          <>
            <Celda ancho="45%" valor="Departamento" />
            <Celda ancho="10%" valor="Empleados" />
            <Celda ancho="23%" valor={c.base} />
            <Celda ancho="22%" valor={c.importe} />
          </>
        ) : (
          <>
            <Celda ancho="14%" valor="Código" />
            <Celda ancho={isr ? "26%" : "36%"} valor="Empleado" />
            <Celda ancho="8%" valor="Días" />
            <Celda ancho={isr ? "17%" : "21%"} valor={c.base} />
            {isr && (
              <Celda ancho="18%" valor="Renta imponible anual proyectada" />
            )}
            <Celda ancho={isr ? "17%" : "21%"} valor={c.importe} />
          </>
        )}
      </View>
    </View>
  );
  const Pie = () => (
    <Text
      fixed
      style={estilos.pie}
      render={({ pageNumber, totalPages }) =>
        `Consulta interna. No es declaración ni comprobante de pago. | ${pageNumber} / ${totalPages}`
      }
    />
  );
  return renderToBuffer(
    <Document
      title={`${c.titulo} - ${periodo}`}
      author="Consulting, S.A."
      creationDate={fecha}
      modificationDate={fecha}
    >
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <Cabecera seccion="Resumen por departamento" resumen />
        {d.grupos.map((g, i) => (
          <View wrap={false} key={i} style={estilos.fila}>
            <Celda ancho="45%" valor={g.departamento} />
            <Celda ancho="10%" valor={String(g.filas.length)} />
            <Celda ancho="23%" dinero valor={g.base} />
            <Celda ancho="22%" dinero valor={g.importe} />
          </View>
        ))}
        <View wrap={false} style={[estilos.fila, estilos.total]}>
          <Celda ancho="45%" valor="Total general" />
          <Celda ancho="10%" valor={String(d.empleados)} />
          <Celda ancho="23%" dinero valor={d.base} />
          <Celda ancho="22%" dinero valor={d.importe} />
        </View>
        <Text style={[estilos.nota, { marginTop: 12 }]}>
          Los departamentos sin movimientos figuran en cero. Los importes
          negativos conservan su signo y se muestran en rojo.
        </Text>
        <Pie />
      </Page>
      {d.grupos
        .filter((g) => g.filas.length > 0)
        .map((g, i) => (
          <Page
            key={i}
            size="A4"
            orientation="landscape"
            style={estilos.pagina}
          >
            <Cabecera seccion={g.departamento} />
            {g.filas.map((f) => (
              <View key={f.empleadoId} wrap={false} style={estilos.fila}>
                <Celda ancho="14%" valor={f.codigo} />
                <Celda ancho={isr ? "26%" : "36%"} valor={f.nombre} />
                <Celda ancho="8%" valor={String(f.diasLaborados)} />
                <Celda ancho={isr ? "17%" : "21%"} dinero valor={f.base} />
                {isr && (
                  <Celda ancho="18%" dinero valor={f.rentaAnual ?? "0.00"} />
                )}
                <Celda ancho={isr ? "17%" : "21%"} dinero valor={f.importe} />
              </View>
            ))}
            <View wrap={false} style={[estilos.fila, estilos.total]}>
              <Celda
                ancho={isr ? "48%" : "58%"}
                valor={`Subtotal del departamento (${g.filas.length} empleados)`}
              />
              <Celda ancho={isr ? "17%" : "21%"} dinero valor={g.base} />
              {isr && <Celda ancho="18%" valor="" />}
              <Celda ancho={isr ? "17%" : "21%"} dinero valor={g.importe} />
            </View>
            <Pie />
          </Page>
        ))}
    </Document>,
  );
}
