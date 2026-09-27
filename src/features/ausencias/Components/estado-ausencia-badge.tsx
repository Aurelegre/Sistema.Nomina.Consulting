"use client";
import { Badge } from "~/components/ui/badge";
import type { Ausencia } from "../Models/ausencias.model";
import { estadoAusencia } from "../Helpers/ausencias.helper";
export function EstadoAusenciaBadge({
  estado,
}: {
  estado: Ausencia["estado"];
}) {
  return (
    <Badge
      variant={
        estado === "RECHAZADA"
          ? "destructive"
          : estado === "PENDIENTE"
            ? "outline"
            : "secondary"
      }
    >
      {estadoAusencia(estado)}
    </Badge>
  );
}
