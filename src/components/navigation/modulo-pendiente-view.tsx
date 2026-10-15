import type { ModuloPendienteProps } from "./Models/modulo-pendiente.model";
export function ModuloPendienteView({ informacion }: ModuloPendienteProps) {
  return (
    <main className="mx-auto max-w-7xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wider text-slate-500 uppercase">
          Módulo
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {informacion.titulo}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          {informacion.descripcion}
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
          <p className="text-sm font-medium text-slate-700">
            Este módulo será implementado en su feature correspondiente.
          </p>
        </div>
      </div>
    </main>
  );
}
