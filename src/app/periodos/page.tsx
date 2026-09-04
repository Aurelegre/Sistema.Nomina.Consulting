import Link from "next/link";

import { PeriodosNominaManager } from "~/app/periodos/_components/periodos-nomina-manager";

export default function PeriodosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Nómina
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Períodos de nómina
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Administra los meses disponibles para registrar novedades y
            procesar la nómina.
          </p>
        </div>

        <Link
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          href="/"
        >
          Volver al inicio
        </Link>
      </div>

      <PeriodosNominaManager />
    </main>
  );
}
