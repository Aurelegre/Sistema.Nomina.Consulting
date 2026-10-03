"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Paginacion } from "~/components/acceso/Paginacion";
import type { EmpleadoCompra } from "../Models/compras-solidarias.model";

export function BuscarEmpleadoCompra({
  modo,
  onSeleccionar,
}: {
  modo: "crear" | "filtrar";
  onSeleccionar: (e: EmpleadoCompra) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const activos = api.comprasSolidarias.empleados.useQuery(
    { busqueda, pagina },
    { enabled: modo === "crear" },
  );
  const historicos = api.comprasSolidarias.empleadosFiltro.useQuery(
    { busqueda, pagina },
    { enabled: modo === "filtrar" },
  );
  const consulta = modo === "crear" ? activos : historicos;
  return (
    <div className="space-y-3">
      <Input
        aria-label="Buscar empleado por nombre o código"
        placeholder="Nombre o código del empleado"
        value={busqueda}
        maxLength={150}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
      />
      {consulta.isPending && <p role="status">Cargando empleados…</p>}
      <ErrorAcceso mensaje={consulta.error?.message} />
      {consulta.isError && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void consulta.refetch()}
        >
          Reintentar
        </Button>
      )}
      {!consulta.isError && consulta.data && (
        <>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {consulta.data.filas.map((e) => (
              <Button
                className="h-auto w-full justify-start text-left whitespace-normal"
                key={e.id}
                type="button"
                variant="outline"
                onClick={() => onSeleccionar(e)}
              >
                {e.codigo} · {e.nombre}
              </Button>
            ))}
            {!consulta.data.filas.length && <p>No se encontraron empleados.</p>}
          </div>
          <Paginacion
            pagina={pagina}
            total={consulta.data.total}
            onChange={setPagina}
            pendiente={consulta.isFetching}
          />
        </>
      )}
    </div>
  );
}
