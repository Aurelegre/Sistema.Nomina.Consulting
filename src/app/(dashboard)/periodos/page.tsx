import { PeriodosNominaManager } from "~/app/periodos/_components/periodos-nomina-manager";

export default function PeriodosPage() {
  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
          Nómina
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Períodos de nómina
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Administra los meses disponibles para registrar novedades y procesar
          la nómina.
        </p>
      </div>

      <PeriodosNominaManager />
    </main>
  );
}
