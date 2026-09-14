"use client";
import { Button } from "~/components/ui/button";
export function Paginacion({
  pagina,
  total,
  tamano = 15,
  onChange,
  pendiente,
}: {
  pagina: number;
  total: number;
  tamano?: number;
  onChange: (pagina: number) => void;
  pendiente?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-muted-foreground text-sm">
        {total} registros · Página {pagina} de{" "}
        {Math.max(1, Math.ceil(total / tamano))}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pagina <= 1 || pendiente}
          onClick={() => onChange(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={pagina * tamano >= total || pendiente}
          onClick={() => onChange(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
