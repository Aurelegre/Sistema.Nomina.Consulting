"use client";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { periodoTexto } from "../Helpers/nomina.helper";
export function NotificacionesNomina() {
  const consulta = api.nomina.notificaciones.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const leer = api.nomina.leerNotificacion.useMutation({
    onSuccess: () => consulta.refetch(),
  });
  return (
    <div className="space-y-2" aria-live="polite">
      {consulta.data?.map((n) => (
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
                ? "El cálculo finalizó y el período está cerrado."
                : n.error}
            </p>
            <div className="flex gap-3">
              <Link href="/nomina">Ir a Nómina</Link>
              <Button
                variant="outline"
                size="sm"
                disabled={leer.isPending}
                onClick={() => leer.mutate({ id: n.id })}
              >
                Entendido
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
