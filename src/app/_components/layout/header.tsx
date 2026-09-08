"use client";

import { usePathname } from "next/navigation";

import { MenuIcon } from "~/app/_components/layout/sidebar-icons";

type HeaderProps = {
  onOpenMobile: () => void;
};

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/empleados": "Empleados",
  "/departamentos": "Departamentos",
  "/periodos": "Períodos de nómina",
  "/nomina": "Nómina",
  "/ausencias": "Ausencias",
  "/asociacion": "Asociación Solidarista",
  "/reportes": "Reportes",
  "/usuarios": "Usuarios",
  "/configuracion": "Configuración",
};

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname();
  const section =
    Object.entries(TITLES).find(([route]) =>
      route === "/" ? pathname === "/" : pathname.startsWith(route)
    )?.[1] ?? "Sistema de Nómina";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        aria-label="Abrir menú lateral"
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
        type="button"
        onClick={onOpenMobile}
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Consulting, S.A.
        </p>
        <h1 className="text-base font-semibold text-slate-950">{section}</h1>
      </div>
    </header>
  );
}
