import Link from "next/link";

import { HealthCheck } from "~/app/_components/health-check";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
        Sistema de Nómina
      </p>

      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
        Consulting, S.A.
      </h1>

      <p className="max-w-2xl text-lg leading-8 text-slate-600">
        Aplicación para administrar y procesar la nómina mensual.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          href="/periodos"
        >
          Administrar períodos
        </Link>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <HealthCheck />
        </div>
      </div>
    </main>
  );
}
