"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { ConfirmarCierrePeriodoModal } from "~/app/periodos/_components/confirmar-cierre-periodo-modal";
import { api } from "~/trpc/react";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

type PeriodoSeleccionado = {
  id: number;
  mes: number;
  anio: number;
};

const formatFecha = (value: Date | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
};

const formatPeriodo = (mes: number, anio: number) =>
  `${MESES[mes - 1] ?? "Mes"} ${anio}`;

export function PeriodosNominaManager() {
  const ahora = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(String(ahora.getMonth() + 1));
  const [anio, setAnio] = useState(String(ahora.getFullYear()));
  const [periodoSeleccionado, setPeriodoSeleccionado] =
    useState<PeriodoSeleccionado | null>(null);

  const utils = api.useUtils();
  const periodos = api.periodosNomina.listar.useQuery();

  const crear = api.periodosNomina.crear.useMutation({
    onSuccess: async () => {
      await utils.periodosNomina.listar.invalidate();
    },
  });

  const cerrar = api.periodosNomina.cerrar.useMutation({
    onSuccess: async () => {
      await utils.periodosNomina.listar.invalidate();
      setPeriodoSeleccionado(null);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    crear.mutate({
      mes: Number(mes),
      anio: Number(anio),
    });
  };

  const abrirModalCierre = (periodo: PeriodoSeleccionado) => {
    cerrar.reset();
    setPeriodoSeleccionado(periodo);
  };

  const cancelarCierre = useCallback(() => {
    cerrar.reset();
    setPeriodoSeleccionado(null);
  }, [cerrar]);

  const confirmarCierre = useCallback(() => {
    if (!periodoSeleccionado) return;

    cerrar.mutate({
      id: periodoSeleccionado.id,
    });
  }, [cerrar, periodoSeleccionado]);

  return (
    <>
      <div className="space-y-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Crear período de nómina
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cada combinación de mes y año puede existir una sola vez.
            </p>
          </div>

          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
            onSubmit={handleSubmit}
          >
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Mes
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                value={mes}
                onChange={(event) => setMes(event.target.value)}
              >
                {MESES.map((nombre, index) => (
                  <option key={nombre} value={index + 1}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Año
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                type="number"
                min={1}
                step={1}
                value={anio}
                onChange={(event) => setAnio(event.target.value)}
                required
              />
            </label>

            <button
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={crear.isPending}
            >
              {crear.isPending ? "Creando..." : "Crear período"}
            </button>
          </form>

          {crear.error ? (
            <p className="mt-4 text-sm font-medium text-red-700">
              {crear.error.message}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Períodos registrados
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Un período cerrado queda disponible únicamente para consulta y
              reportes.
            </p>
          </div>

          {periodos.isPending ? (
            <p className="px-6 py-8 text-sm text-slate-600">
              Cargando períodos...
            </p>
          ) : periodos.isError ? (
            <p className="px-6 py-8 text-sm font-medium text-red-700">
              {periodos.error.message}
            </p>
          ) : periodos.data.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-600">
              Todavía no hay períodos de nómina registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Período</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Creación</th>
                    <th className="px-6 py-3">Cierre</th>
                    <th className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodos.data.map((periodo) => (
                    <tr key={periodo.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-950">
                        {formatPeriodo(periodo.mes, periodo.anio)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={
                            periodo.estado === "ABIERTO"
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                              : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          }
                        >
                          {periodo.estado}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatFecha(periodo.fechaCreacion)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatFecha(periodo.fechaCierre)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {periodo.estado === "ABIERTO" ? (
                          <button
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            type="button"
                            onClick={() =>
                              abrirModalCierre({
                                id: periodo.id,
                                mes: periodo.mes,
                                anio: periodo.anio,
                              })
                            }
                          >
                            Cerrar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Sin acciones
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmarCierrePeriodoModal
        abierto={periodoSeleccionado !== null}
        periodo={
          periodoSeleccionado
            ? formatPeriodo(periodoSeleccionado.mes, periodoSeleccionado.anio)
            : ""
        }
        procesando={cerrar.isPending}
        error={cerrar.error?.message}
        onCancelar={cancelarCierre}
        onConfirmar={confirmarCierre}
      />
    </>
  );
}
