"use client";
import { useSeguimientoNomina } from "../Hooks/seguimiento-nomina";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { periodoTexto } from "../Helpers/nomina.helper";
export function NotificacionesNomina() {
  const { aviso: n, descartar } = useSeguimientoNomina();
  if (!n) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      <Alert
        key={n.id}
        variant={n.estado === "FALLIDA" ? "destructive" : "default"}
      >
        <AlertTitle>
          {n.estado === "COMPLETADA"
            ? "Nómina generada"
            : "La generación de nómina falló"}{" "}
          · {periodoTexto(n.periodo)}
        </AlertTitle>
        <AlertDescription>
          <p>
            {n.estado === "COMPLETADA"
              ? "El proceso ha finalizado. Recarga la página de Nómina para ver los resultados."
              : "El proceso finalizó con un error. Recarga la página de Nómina para revisar el resultado."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="link"
              onClick={() => window.location.assign("/nomina")}
            >
              Recargar página de Nómina
            </Button>
            <Button variant="outline" size="sm" onClick={descartar}>
              Entendido
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
