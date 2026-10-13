import { Building2, Layers3 } from "lucide-react";
import { LoginForm } from "./Components/login-form";

export function SesionView() {
  return (
    <div className="grid min-h-svh w-full grid-rows-[auto_1fr] lg:grid-cols-[1fr_1.1fr] lg:grid-rows-1">
      <section
        className="relative flex flex-col justify-between overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16 lg:py-12"
        aria-label="Consulting, S.A."
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 bottom-0 hidden h-[32rem] w-[32rem] rotate-12 rounded-[5rem] border border-white/10 lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-20 hidden h-80 w-80 rotate-12 rounded-[4rem] border border-white/10 lg:block"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-semibold tracking-wide">
            CS
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">
              Consulting, S.A.
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Sistema de Nómina</p>
          </div>
        </div>
        <div className="relative hidden max-w-md space-y-6 py-20 lg:block">
          <Layers3
            className="size-9 text-slate-400"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <h2 className="text-4xl leading-tight font-medium tracking-tight xl:text-5xl">
            La gestión de tu equipo,
            <br />
            <span className="text-slate-400">en un solo lugar.</span>
          </h2>
          <p className="max-w-sm text-base leading-7 text-slate-300">
            Accede a las herramientas de administración de personal y nómina
            para continuar con tus actividades.
          </p>
        </div>
        <div className="relative hidden items-center gap-2 border-t border-white/10 pt-6 text-xs text-slate-400 lg:flex">
          <Building2 className="size-4" aria-hidden="true" />
          <span>Portal de uso interno</span>
        </div>
      </section>
      <section
        className="flex flex-col items-center justify-center bg-slate-50 px-5 py-12 sm:px-10 lg:py-16"
        aria-label="Acceso al sistema"
      >
        <div className="w-full max-w-md">
          <LoginForm />
          <p className="mt-7 text-center text-xs leading-5 text-slate-500">
            Si necesitas ayuda con tu acceso, contacta al administrador del
            sistema.
          </p>
        </div>
      </section>
    </div>
  );
}
