"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";

// Render the actual export PDF, not a second HTML template. The worker is bundled
// locally by Next; previewing financial data never contacts an external viewer.
export function VistaPreviaPoliza({ pdf }: { pdf: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [documento, setDocumento] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(1);
  const [ancho, setAncho] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setAncho(Math.max(200, Math.min(850, entry.contentRect.width)));
    });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelado = false;
    let documentoCargado: PDFDocumentProxy | undefined;
    setDocumento(null);
    setPagina(1);
    setError("");
    setCargando(true);
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      documentoCargado = await pdfjs.getDocument({
        data: Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0)),
        useSystemFonts: true,
      }).promise;
      if (cancelado) {
        await documentoCargado.destroy();
        return;
      }
      setDocumento(documentoCargado);
    })().catch(() => {
      if (!cancelado) {
        setError("No fue posible mostrar el PDF. Actualiza la vista previa.");
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
      if (documentoCargado) void documentoCargado.destroy();
    };
  }, [pdf]);
  useEffect(() => {
    if (!documento || !canvas.current) return;
    let cancelado = false;
    let tarea: RenderTask | undefined;
    const superficie = canvas.current;
    setCargando(true);
    setTexto("");
    void (async () => {
      const hoja = await documento.getPage(pagina);
      if (cancelado) return;
      const base = hoja.getViewport({ scale: 1 });
      const viewport = hoja.getViewport({ scale: (ancho / base.width) * zoom });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      superficie.width = Math.ceil(viewport.width * ratio);
      superficie.height = Math.ceil(viewport.height * ratio);
      superficie.style.width = `${viewport.width}px`;
      superficie.style.height = `${viewport.height}px`;
      tarea = hoja.render({
        canvas: superficie,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      });
      await tarea.promise;
      const contenido = await hoja.getTextContent();
      if (!cancelado) {
        setTexto(
          contenido.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
        setCargando(false);
      }
    })().catch(() => {
      if (!cancelado) {
        setError("No fue posible mostrar esta página del PDF.");
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
      tarea?.cancel();
    };
  }, [documento, pagina, ancho, zoom]);
  return (
    <section aria-label="Vista previa de póliza contable" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={!documento || pagina === 1}
          onClick={() => setPagina((p) => p - 1)}
        >
          Anterior
        </Button>
        <span aria-live="polite">
          Página {pagina} de {documento?.numPages ?? "…"}
        </span>
        <Button
          variant="outline"
          disabled={!documento || pagina === documento.numPages}
          onClick={() => setPagina((p) => p + 1)}
        >
          Siguiente
        </Button>
        <Button
          variant="outline"
          onClick={() => setZoom((z) => (z === 1 ? 1.5 : 1))}
        >
          {zoom === 1 ? "Ampliar" : "Ajustar al ancho"}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {cargando && <p role="status">Mostrando documento…</p>}
      <div
        ref={contenedor}
        className="w-full overflow-auto rounded-lg border bg-slate-200"
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Página ${pagina} de la póliza contable`}
          className="mx-auto bg-white"
        />
      </div>
      <p className="sr-only">{texto}</p>
    </section>
  );
}
